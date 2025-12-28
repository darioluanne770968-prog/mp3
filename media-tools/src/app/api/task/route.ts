import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addJob, JobData, JobType } from "@/lib/queue";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { getUploadDir } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, inputFileId, params } = body;

    // Get input file
    const inputFile = await prisma.file.findUnique({
      where: { id: inputFileId },
    });

    if (!inputFile) {
      return NextResponse.json(
        { error: "Input file not found" },
        { status: 404 }
      );
    }

    // Create output file path
    const taskId = uuidv4();
    const ext = getOutputExtension(type, params?.format);
    const outputPath = path.join(getUploadDir(), `${taskId}${ext}`);

    // Create task
    const task = await prisma.task.create({
      data: {
        id: taskId,
        type,
        status: "PENDING",
        inputFile: inputFile.storagePath,
        outputFile: outputPath,
        params,
      },
    });

    // Add job to queue
    const jobData: JobData = {
      taskId,
      type: type as JobType,
      inputFile: inputFile.storagePath,
      outputFile: outputPath,
      params: params || {},
    };

    await addJob(jobData);

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
    });
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

function getOutputExtension(type: string, format?: string): string {
  if (format) {
    return `.${format}`;
  }

  const audioTypes = ["audio-trim", "audio-merge", "audio-volume", "audio-speed", "audio-pitch", "audio-equalizer", "audio-reverse"];
  const videoTypes = ["video-trim", "video-crop", "video-rotate", "video-speed", "video-volume", "video-mute", "video-add-music", "video-loop", "video-reverse"];

  if (audioTypes.includes(type)) return ".mp3";
  if (videoTypes.includes(type)) return ".mp4";
  if (type === "audio-ringtone") return ".m4r";
  if (type.startsWith("pdf-")) return ".pdf";

  return ".out";
}
