import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../route";
import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";
import { saveUploadedFile } from "@/lib/storage";

const VALID_FORMATS = ["mp3", "wav", "ogg", "flac", "aac", "m4a", "wma"];

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
    const format = (formData.get("format") as string)?.toLowerCase();
    const bitrate = formData.get("bitrate") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!format || !VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Supported: ${VALID_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    // Save file
    const { filePath, fileId } = await saveUploadedFile(file);

    // Create task
    const task = await prisma.task.create({
      data: {
        type: "audio-convert",
        inputFile: filePath,
        params: { format, bitrate: bitrate || "192k" },
        userId: auth.user?.id,
      },
    });

    // Add to queue
    await addJob("audio-convert", {
      taskId: task.id,
      inputFile: filePath,
      format,
      bitrate: bitrate || "192k",
    });

    return NextResponse.json({
      success: true,
      taskId: task.id,
      status: "pending",
      message: "Task queued for processing",
    });
  } catch (error) {
    console.error("API audio convert error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
