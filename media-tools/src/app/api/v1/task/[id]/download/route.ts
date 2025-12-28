import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../../route";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

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

    if (task.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Task not completed", status: task.status },
        { status: 400 }
      );
    }

    if (!task.outputFile) {
      return NextResponse.json(
        { error: "No output file available" },
        { status: 404 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(task.outputFile)) {
      return NextResponse.json(
        { error: "Output file not found" },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = fs.readFileSync(task.outputFile);
    const fileName = path.basename(task.outputFile);
    const ext = path.extname(fileName).toLowerCase();

    // Determine content type
    const contentTypes: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".flac": "audio/flac",
      ".aac": "audio/aac",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
      ".mov": "video/quicktime",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("API task download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
