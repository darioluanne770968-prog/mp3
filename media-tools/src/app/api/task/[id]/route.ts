import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getJobProgress } from "@/lib/queue";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Get real-time progress from queue
    const queueStatus = await getJobProgress(params.id);

    return NextResponse.json({
      id: task.id,
      type: task.type,
      status: task.status,
      progress: queueStatus.progress || task.progress,
      outputFile: task.outputFile,
      error: task.error,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    });
  } catch (error) {
    console.error("Task status error:", error);
    return NextResponse.json(
      { error: "Failed to get task status" },
      { status: 500 }
    );
  }
}
