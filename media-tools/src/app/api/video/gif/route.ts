import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const startTime = parseFloat((formData.get("start") as string) || "0");
    const duration = parseFloat((formData.get("duration") as string) || "5");
    const fps = parseInt((formData.get("fps") as string) || "10");
    const width = parseInt((formData.get("width") as string) || "480");
    const loop = (formData.get("loop") as string) !== "false";

    if (!file) {
      return NextResponse.json(
        { error: "请上传视频文件" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "只支持视频文件" },
        { status: 400 }
      );
    }

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempId = uuidv4();
    const ext = path.extname(file.name) || ".mp4";
    const inputPath = `/tmp/gif_input_${tempId}${ext}`;
    const palettePath = `/tmp/gif_palette_${tempId}.png`;
    const outputPath = `/tmp/gif_output_${tempId}.gif`;

    fs.writeFileSync(inputPath, buffer);

    try {
      // Two-pass approach for high-quality GIF
      // Pass 1: Generate optimized palette
      const filters = `fps=${fps},scale=${width}:-1:flags=lanczos`;
      await execAsync(
        `ffmpeg -ss ${startTime} -t ${duration} -i "${inputPath}" -vf "${filters},palettegen=stats_mode=diff" -y "${palettePath}"`
      );

      // Pass 2: Generate GIF using palette
      const loopFlag = loop ? "0" : "-1"; // 0 = infinite loop, -1 = no loop
      await execAsync(
        `ffmpeg -ss ${startTime} -t ${duration} -i "${inputPath}" -i "${palettePath}" -lavfi "${filters} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop ${loopFlag} -y "${outputPath}"`
      );

      // Read result
      const resultBuffer = fs.readFileSync(outputPath);

      return new NextResponse(resultBuffer, {
        headers: {
          "Content-Type": "image/gif",
          "Content-Disposition": `attachment; filename="animation.gif"`,
          "Content-Length": resultBuffer.length.toString(),
        },
      });
    } finally {
      // Clean up
      [inputPath, palettePath, outputPath].forEach((p) => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
  } catch (error) {
    console.error("GIF creation error:", error);
    return NextResponse.json(
      { error: "GIF 创建失败" },
      { status: 500 }
    );
  }
}
