import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate API key
    const auth = await validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = params;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (task.userId && task.userId !== auth.user?.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      error: task.error,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      hasOutput: !!task.outputFile,
    });
  } catch (error) {
    console.error("API task status error:", error);
    return NextResponse.json(
      { error: "Failed to get task status" },
      { status: 500 }
    );
  }
}
