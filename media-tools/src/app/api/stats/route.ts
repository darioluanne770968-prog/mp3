import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d, all

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyUsage: true,
        dailyLimit: true,
        storageUsed: true,
        storageLimit: true,
        role: true,
      },
    });

    // Get task statistics
    const taskStats = await prisma.task.groupBy({
      by: ["status"],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Get tasks by type
    const tasksByType = await prisma.task.groupBy({
      by: ["type"],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: {
        _count: {
          type: "desc",
        },
      },
      take: 10,
    });

    // Get daily task counts for chart
    const dailyTasks = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "Task"
      WHERE user_id = ${userId}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as { date: Date; count: bigint }[];

    // Get storage usage by file type
    const storageByType = await prisma.file.groupBy({
      by: ["mimeType"],
      where: {
        userId,
      },
      _sum: {
        size: true,
      },
      orderBy: {
        _sum: {
          size: "desc",
        },
      },
      take: 5,
    });

    // Get recent activity
    const recentTasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // Calculate statistics
    const totalTasks = taskStats.reduce((sum, s) => sum + s._count, 0);
    const completedTasks = taskStats.find((s) => s.status === "COMPLETED")?._count || 0;
    const failedTasks = taskStats.find((s) => s.status === "FAILED")?._count || 0;
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return NextResponse.json({
      user: {
        dailyUsage: user?.dailyUsage || 0,
        dailyLimit: user?.dailyLimit || 10,
        storageUsed: Number(user?.storageUsed || 0),
        storageLimit: Number(user?.storageLimit || 1073741824),
        role: user?.role || "FREE",
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        failed: failedTasks,
        pending: taskStats.find((s) => s.status === "PENDING")?._count || 0,
        processing: taskStats.find((s) => s.status === "PROCESSING")?._count || 0,
        successRate: Math.round(successRate * 100) / 100,
      },
      tasksByType: tasksByType.map((t) => ({
        type: t.type,
        count: t._count,
      })),
      dailyTasks: dailyTasks.map((d) => ({
        date: d.date.toISOString().split("T")[0],
        count: Number(d.count),
      })),
      storageByType: storageByType.map((s) => ({
        type: s.mimeType,
        size: Number(s._sum.size || 0),
      })),
      recentTasks,
      period,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
