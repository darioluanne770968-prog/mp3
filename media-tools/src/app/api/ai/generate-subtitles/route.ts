import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Segment {
  start: number;
  end: number;
  text: string;
}

function formatSRT(segments: Segment[]): string {
  return segments
    .map((segment, index) => {
      const startTime = formatTimestamp(segment.start);
      const endTime = formatTimestamp(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join("\n");
}

function formatVTT(segments: Segment[]): string {
  const lines = ["WEBVTT\n"];
  segments.forEach((segment, index) => {
    const startTime = formatTimestampVTT(segment.start);
    const endTime = formatTimestampVTT(segment.end);
    lines.push(`${index + 1}`);
    lines.push(`${startTime} --> ${endTime}`);
    lines.push(segment.text);
    lines.push("");
  });
  return lines.join("\n");
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function formatTimestampVTT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check user role
    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: (session.user as any).id },
      });

      if (user?.role !== "PRO" && user?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "AI 功能仅限 PRO 用户使用" },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const language = (formData.get("language") as string) || "zh";
    const format = (formData.get("format") as string) || "srt";

    if (!file) {
      return NextResponse.json(
        { error: "请上传视频或音频文件" },
        { status: 400 }
      );
    }

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempId = uuidv4();
    const inputPath = `/tmp/subtitle_input_${tempId}${getExtension(file.name)}`;
    const audioPath = `/tmp/subtitle_audio_${tempId}.mp3`;

    fs.writeFileSync(inputPath, buffer);

    try {
      // Extract audio from video if needed
      const isVideo = file.type.startsWith("video/");
      if (isVideo) {
        await execAsync(
          `ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -q:a 4 "${audioPath}" -y`
        );
      } else {
        fs.copyFileSync(inputPath, audioPath);
      }

      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        language,
        response_format: "verbose_json",
      });

      // Convert segments to subtitle format
      const segments: Segment[] = (transcription.segments || []).map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text.trim(),
      }));

      let subtitleContent: string;
      let contentType: string;
      let filename: string;

      if (format === "vtt") {
        subtitleContent = formatVTT(segments);
        contentType = "text/vtt";
        filename = "subtitles.vtt";
      } else {
        subtitleContent = formatSRT(segments);
        contentType = "application/x-subrip";
        filename = "subtitles.srt";
      }

      // Record usage
      if (session?.user) {
        await prisma.usageRecord.create({
          data: {
            toolType: "ai",
            action: "generate-subtitles",
            fileSize: buffer.length,
            userId: (session.user as any).id,
          },
        });
      }

      return new NextResponse(subtitleContent, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } finally {
      // Clean up temp files
      [inputPath, audioPath].forEach((p) => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
  } catch (error: any) {
    console.error("Subtitle generation error:", error);

    if (error?.code === "insufficient_quota") {
      return NextResponse.json(
        { error: "API 配额不足" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "字幕生成失败" },
      { status: 500 }
    );
  }
}

function getExtension(filename: string): string {
  const ext = filename.split(".").pop();
  return ext ? `.${ext}` : "";
}
