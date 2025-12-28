import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../route";
import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";
import { saveUploadedFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const auth = await validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const start = parseFloat(formData.get("start") as string);
    const end = parseFloat(formData.get("end") as string);

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (isNaN(start) || isNaN(end) || start >= end) {
      return NextResponse.json(
        { error: "Invalid start/end times" },
        { status: 400 }
      );
    }

    // Save file
    const { filePath, fileId } = await saveUploadedFile(file);

    // Create task
    const task = await prisma.task.create({
      data: {
        type: "audio-trim",
        inputFile: filePath,
        params: { start, end },
        userId: auth.user?.id,
      },
    });

    // Add to queue
    await addJob("audio-trim", {
      taskId: task.id,
      inputFile: filePath,
      start,
      end,
    });

    return NextResponse.json({
      success: true,
      taskId: task.id,
      status: "pending",
      message: "Task queued for processing",
    });
  } catch (error) {
    console.error("API audio trim error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
