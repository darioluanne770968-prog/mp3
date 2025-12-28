import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { name, tasks } = await request.json();

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: "请提供要处理的任务" },
        { status: 400 }
      );
    }

    // Check user limits
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    const remainingQuota = user.dailyLimit - user.dailyUsage;
    if (tasks.length > remainingQuota) {
      return NextResponse.json(
        { error: `每日配额不足，剩余 ${remainingQuota} 次` },
        { status: 429 }
      );
    }

    // Create batch job
    const batch = await prisma.batchJob.create({
      data: {
        name: name || `批量任务 ${new Date().toLocaleString()}`,
        totalTasks: tasks.length,
        userId: user.id,
      },
    });

    // Create individual tasks
    const createdTasks = await Promise.all(
      tasks.map(async (task: any) => {
        const dbTask = await prisma.task.create({
          data: {
            type: task.type,
            inputFile: task.inputFile,
            params: task.params,
            userId: user.id,
            batchId: batch.id,
          },
        });

        // Add to queue
        await addJob(task.type, {
          taskId: dbTask.id,
          inputFile: task.inputFile,
          ...task.params,
        });

        return dbTask;
      })
    );

    // Update user daily usage
    await prisma.user.update({
      where: { id: user.id },
      data: { dailyUsage: { increment: tasks.length } },
    });

    return NextResponse.json({
      success: true,
      batch: {
        id: batch.id,
        name: batch.name,
        totalTasks: batch.totalTasks,
      },
      tasks: createdTasks.map((t) => ({ id: t.id, type: t.type })),
    });
  } catch (error) {
    console.error("Batch creation error:", error);
    return NextResponse.json(
      { error: "批量任务创建失败" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const batches = await prisma.batchJob.findMany({
      where: { userId: (session.user as any).id },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            progress: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ batches });
  } catch (error) {
    console.error("Batch list error:", error);
    return NextResponse.json(
      { error: "获取批量任务列表失败" },
      { status: 500 }
    );
  }
}
