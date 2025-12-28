import { NextRequest, NextResponse } from "next/server";
import { saveFile } from "@/lib/storage";
import { getMediaInfo } from "@/lib/ffmpeg";
import prisma from "@/lib/prisma";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "500000000");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { path, id } = await saveFile(buffer, file.name);

    // Get media info if it's a media file
    let mediaInfo = null;
    try {
      mediaInfo = await getMediaInfo(path);
    } catch {
      // Not a media file or ffprobe not available
    }

    // Save to database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const fileRecord = await prisma.file.create({
      data: {
        id,
        originalName: file.name,
        storagePath: path,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        duration: mediaInfo?.duration ?? null,
        width: mediaInfo?.videoStreams[0]?.width ?? null,
        height: mediaInfo?.videoStreams[0]?.height ?? null,
        metadata: mediaInfo ? JSON.parse(JSON.stringify(mediaInfo)) : null,
        expiresAt,
      },
    });

    return NextResponse.json({
      id: fileRecord.id,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      duration: mediaInfo?.duration,
      width: mediaInfo?.videoStreams[0]?.width,
      height: mediaInfo?.videoStreams[0]?.height,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
