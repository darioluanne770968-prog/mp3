import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is PRO for AI features
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
    const language = formData.get("language") as string || "zh";

    if (!file) {
      return NextResponse.json(
        { error: "请上传音频文件" },
        { status: 400 }
      );
    }

    // Convert File to buffer and save temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = `/tmp/whisper_${Date.now()}_${file.name}`;
    fs.writeFileSync(tempPath, buffer);

    try {
      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: "whisper-1",
        language,
        response_format: "verbose_json",
      });

      // Record usage
      if (session?.user) {
        await prisma.usageRecord.create({
          data: {
            toolType: "ai",
            action: "speech-to-text",
            fileSize: buffer.length,
            userId: (session.user as any).id,
          },
        });
      }

      return NextResponse.json({
        success: true,
        transcription: {
          text: transcription.text,
          language: transcription.language,
          duration: transcription.duration,
          segments: transcription.segments,
        },
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  } catch (error: any) {
    console.error("Speech to text error:", error);

    if (error?.code === "insufficient_quota") {
      return NextResponse.json(
        { error: "API 配额不足" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "语音转文字失败" },
      { status: 500 }
    );
  }
}
