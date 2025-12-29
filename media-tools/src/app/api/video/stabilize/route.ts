import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const execAsync = promisify(exec);

// Video stabilization using FFmpeg's vidstabdetect and vidstabtransform filters
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const shakiness = parseInt((formData.get("shakiness") as string) || "5"); // 1-10
    const accuracy = parseInt((formData.get("accuracy") as string) || "15"); // 1-15
    const smoothing = parseInt((formData.get("smoothing") as string) || "10"); // 0-100
    const zoom = parseInt((formData.get("zoom") as string) || "0"); // -100 to 100

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
    const inputPath = `/tmp/stab_input_${tempId}${ext}`;
    const transformsPath = `/tmp/stab_transforms_${tempId}.trf`;
    const outputPath = `/tmp/stab_output_${tempId}${ext}`;

    fs.writeFileSync(inputPath, buffer);

    try {
      // Pass 1: Analyze video and detect shakiness
      // vidstabdetect analyzes the video and outputs motion data
      await execAsync(
        `ffmpeg -i "${inputPath}" -vf "vidstabdetect=shakiness=${shakiness}:accuracy=${accuracy}:result='${transformsPath}'" -f null -`
      );

      // Pass 2: Apply stabilization transforms
      // vidstabtransform uses the motion data to stabilize the video
      const zoomMode = zoom > 0 ? zoom : 0;
      const optzoom = zoom === 0 ? 1 : 0; // Optimal zoom when zoom is 0

      await execAsync(
        `ffmpeg -i "${inputPath}" -vf "vidstabtransform=input='${transformsPath}':smoothing=${smoothing}:zoom=${zoomMode}:optzoom=${optzoom}:interpol=linear" -c:a copy "${outputPath}" -y`
      );

      // Read result
      const resultBuffer = fs.readFileSync(outputPath);

      // Determine content type
      const contentTypes: Record<string, string> = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
      };

      return new NextResponse(resultBuffer, {
        headers: {
          "Content-Type": contentTypes[ext] || "video/mp4",
          "Content-Disposition": `attachment; filename="stabilized${ext}"`,
          "Content-Length": resultBuffer.length.toString(),
        },
      });
    } finally {
      // Clean up
      [inputPath, transformsPath, outputPath].forEach((p) => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
  } catch (error) {
    console.error("Stabilization error:", error);
    return NextResponse.json(
      { error: "视频稳定处理失败" },
      { status: 500 }
    );
  }
}
