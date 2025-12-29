import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const execAsync = promisify(exec);

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

const POSITION_MAP: Record<Position, string> = {
  "top-left": "10:10",
  "top-right": "main_w-overlay_w-10:10",
  "bottom-left": "10:main_h-overlay_h-10",
  "bottom-right": "main_w-overlay_w-10:main_h-overlay_h-10",
  "center": "(main_w-overlay_w)/2:(main_h-overlay_h)/2",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    const watermarkFile = formData.get("watermark") as File;
    const text = formData.get("text") as string;
    const position = (formData.get("position") as Position) || "bottom-right";
    const opacity = parseFloat((formData.get("opacity") as string) || "0.7");
    const scale = parseFloat((formData.get("scale") as string) || "0.2");
    const fontSize = parseInt((formData.get("fontSize") as string) || "24");
    const fontColor = (formData.get("fontColor") as string) || "white";

    if (!videoFile) {
      return NextResponse.json(
        { error: "请上传视频文件" },
        { status: 400 }
      );
    }

    if (!watermarkFile && !text) {
      return NextResponse.json(
        { error: "请提供水印图片或文字" },
        { status: 400 }
      );
    }

    // Save files
    const tempId = uuidv4();
    const videoExt = path.extname(videoFile.name) || ".mp4";
    const inputPath = `/tmp/wm_video_${tempId}${videoExt}`;
    const outputPath = `/tmp/wm_output_${tempId}${videoExt}`;

    const videoBytes = await videoFile.arrayBuffer();
    fs.writeFileSync(inputPath, Buffer.from(videoBytes));

    let watermarkPath = "";
    if (watermarkFile) {
      const wmExt = path.extname(watermarkFile.name) || ".png";
      watermarkPath = `/tmp/wm_image_${tempId}${wmExt}`;
      const wmBytes = await watermarkFile.arrayBuffer();
      fs.writeFileSync(watermarkPath, Buffer.from(wmBytes));
    }

    try {
      let filterComplex: string;
      let inputs = `-i "${inputPath}"`;

      if (watermarkFile && watermarkPath) {
        // Image watermark
        inputs += ` -i "${watermarkPath}"`;
        const positionCoords = POSITION_MAP[position];

        filterComplex = `[1:v]scale=iw*${scale}:ih*${scale},format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=${positionCoords}`;
      } else {
        // Text watermark
        const positionCoords = POSITION_MAP[position];
        const [x, y] = positionCoords.split(":");

        // Escape special characters for FFmpeg
        const escapedText = text
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "'\\''")
          .replace(/:/g, "\\:");

        filterComplex = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}@${opacity}:x=${x}:y=${y}:shadowcolor=black@0.5:shadowx=2:shadowy=2`;
      }

      await execAsync(
        `ffmpeg ${inputs} -filter_complex "${filterComplex}" -c:a copy "${outputPath}" -y`
      );

      // Read result
      const resultBuffer = fs.readFileSync(outputPath);

      // Determine content type
      const contentType = videoExt === ".webm" ? "video/webm" : "video/mp4";

      return new NextResponse(resultBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="watermarked${videoExt}"`,
          "Content-Length": resultBuffer.length.toString(),
        },
      });
    } finally {
      // Clean up
      [inputPath, watermarkPath, outputPath].forEach((p) => {
        if (p && fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
  } catch (error) {
    console.error("Watermark error:", error);
    return NextResponse.json(
      { error: "添加水印失败" },
      { status: 500 }
    );
  }
}
