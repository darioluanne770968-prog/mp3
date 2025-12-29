import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Queue } from "bullmq";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    // Only admins can see full queue status
    const isAdmin = user?.role === "ADMIN";

    // Get queue instance
    const queue = new Queue("media-processing", {
      connection: redis,
    });

    // Get queue counts
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    // Get user's tasks in queue
    const userTasks = await prisma.task.findMany({
      where: {
        userId: (session.user as any).id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get recent jobs from queue (admin only)
    let recentJobs: any[] = [];
    if (isAdmin) {
      const [activeJobs, waitingJobs] = await Promise.all([
        queue.getActive(0, 10),
        queue.getWaiting(0, 10),
      ]);

      recentJobs = [...activeJobs, ...waitingJobs].map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
      }));
    }

    // Get worker status (admin only)
    let workers: any[] = [];
    if (isAdmin) {
      const workerKeys = await redis.keys("bull:media-processing:workers:*");
      workers = await Promise.all(
        workerKeys.map(async (key) => {
          const data = await redis.hgetall(key);
          return {
            id: key.split(":").pop(),
            ...data,
          };
        })
      );
    }

    return NextResponse.json({
      queue: {
        name: "media-processing",
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
      },
      userTasks: userTasks.map((task) => ({
        id: task.id,
        type: task.type,
        status: task.status,
        progress: task.progress,
        createdAt: task.createdAt,
      })),
      ...(isAdmin && {
        recentJobs,
        workers,
      }),
    });
  } catch (error) {
    console.error("Queue status error:", error);
    return NextResponse.json(
      { error: "获取队列状态失败" },
      { status: 500 }
    );
  }
}

// Retry failed job (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "只有管理员可以执行此操作" },
        { status: 403 }
      );
    }

    const { action, jobId, taskId } = await request.json();

    const queue = new Queue("media-processing", {
      connection: redis,
    });

    switch (action) {
      case "retry": {
        const job = await queue.getJob(jobId);
        if (job) {
          await job.retry();
          return NextResponse.json({ success: true, message: "任务已重试" });
        }
        return NextResponse.json({ error: "任务不存在" }, { status: 404 });
      }

      case "remove": {
        const job = await queue.getJob(jobId);
        if (job) {
          await job.remove();
          return NextResponse.json({ success: true, message: "任务已删除" });
        }
        return NextResponse.json({ error: "任务不存在" }, { status: 404 });
      }

      case "clean-failed": {
        await queue.clean(0, 1000, "failed");
        return NextResponse.json({ success: true, message: "失败任务已清理" });
      }

      case "clean-completed": {
        await queue.clean(0, 1000, "completed");
        return NextResponse.json({ success: true, message: "已完成任务已清理" });
      }

      case "pause": {
        await queue.pause();
        return NextResponse.json({ success: true, message: "队列已暂停" });
      }

      case "resume": {
        await queue.resume();
        return NextResponse.json({ success: true, message: "队列已恢复" });
      }

      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (error) {
    console.error("Queue action error:", error);
    return NextResponse.json(
      { error: "操作失败" },
      { status: 500 }
    );
  }
}
