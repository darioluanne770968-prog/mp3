import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const execAsync = promisify(exec);

// Audio denoise using FFmpeg's anlmdn (non-local means denoiser) and highpass/lowpass filters
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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
    const strength = parseFloat((formData.get("strength") as string) || "0.5");
    const removeHum = formData.get("removeHum") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "请上传音频文件" },
        { status: 400 }
      );
    }

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempId = uuidv4();
    const ext = path.extname(file.name) || ".mp3";
    const inputPath = `/tmp/denoise_input_${tempId}${ext}`;
    const outputPath = `/tmp/denoise_output_${tempId}${ext}`;

    fs.writeFileSync(inputPath, buffer);

    try {
      // Build FFmpeg filter chain
      const filters: string[] = [];

      // High-pass filter to remove low frequency rumble
      if (removeHum) {
        filters.push("highpass=f=80");
        // Notch filter for 50/60Hz hum
        filters.push("bandreject=frequency=50:width_type=q:width=10");
        filters.push("bandreject=frequency=60:width_type=q:width=10");
      }

      // Non-local means denoiser
      // s: noise suppression strength (0-1)
      // p: patch radius (default 2000)
      // r: research radius (default 6000)
      const noiseStrength = Math.min(1, Math.max(0, strength));
      filters.push(`anlmdn=s=${noiseStrength}:p=2000:r=6000`);

      // Apply slight compression to even out levels
      filters.push("acompressor=threshold=-20dB:ratio=4:attack=5:release=50");

      // Normalize audio levels
      filters.push("loudnorm=I=-16:TP=-1.5:LRA=11");

      const filterString = filters.join(",");

      await execAsync(
        `ffmpeg -i "${inputPath}" -af "${filterString}" "${outputPath}" -y`
      );

      // Read result
      const resultBuffer = fs.readFileSync(outputPath);

      // Record usage
      if (session?.user) {
        await prisma.usageRecord.create({
          data: {
            toolType: "ai",
            action: "audio-denoise",
            fileSize: buffer.length,
            userId: (session.user as any).id,
          },
        });
      }

      // Determine content type
      const contentTypes: Record<string, string> = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
        ".m4a": "audio/mp4",
      };

      return new NextResponse(resultBuffer, {
        headers: {
          "Content-Type": contentTypes[ext] || "audio/mpeg",
          "Content-Disposition": `attachment; filename="denoised${ext}"`,
          "Content-Length": resultBuffer.length.toString(),
        },
      });
    } finally {
      // Clean up
      [inputPath, outputPath].forEach((p) => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
  } catch (error) {
    console.error("Denoise error:", error);
    return NextResponse.json(
      { error: "音频降噪失败" },
      { status: 500 }
    );
  }
}
