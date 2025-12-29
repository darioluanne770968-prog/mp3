import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const execAsync = promisify(exec);

// Social media platform presets
interface PlatformPreset {
  name: string;
  width: number;
  height: number;
  maxDuration: number; // seconds
  maxSize: number; // MB
  fps: number;
  videoBitrate: string;
  audioBitrate: string;
  aspectRatio: string;
}

const PLATFORM_PRESETS: Record<string, PlatformPreset> = {
  // Instagram
  "instagram-feed": {
    name: "Instagram Feed",
    width: 1080,
    height: 1080,
    maxDuration: 60,
    maxSize: 100,
    fps: 30,
    videoBitrate: "3500k",
    audioBitrate: "128k",
    aspectRatio: "1:1",
  },
  "instagram-story": {
    name: "Instagram Story",
    width: 1080,
    height: 1920,
    maxDuration: 15,
    maxSize: 30,
    fps: 30,
    videoBitrate: "3500k",
    audioBitrate: "128k",
    aspectRatio: "9:16",
  },
  "instagram-reels": {
    name: "Instagram Reels",
    width: 1080,
    height: 1920,
    maxDuration: 90,
    maxSize: 100,
    fps: 30,
    videoBitrate: "3500k",
    audioBitrate: "128k",
    aspectRatio: "9:16",
  },
  // TikTok
  tiktok: {
    name: "TikTok",
    width: 1080,
    height: 1920,
    maxDuration: 180,
    maxSize: 287,
    fps: 30,
    videoBitrate: "4000k",
    audioBitrate: "128k",
    aspectRatio: "9:16",
  },
  // YouTube
  "youtube-standard": {
    name: "YouTube Standard",
    width: 1920,
    height: 1080,
    maxDuration: 43200, // 12 hours
    maxSize: 128000,
    fps: 30,
    videoBitrate: "8000k",
    audioBitrate: "256k",
    aspectRatio: "16:9",
  },
  "youtube-shorts": {
    name: "YouTube Shorts",
    width: 1080,
    height: 1920,
    maxDuration: 60,
    maxSize: 100,
    fps: 30,
    videoBitrate: "4000k",
    audioBitrate: "128k",
    aspectRatio: "9:16",
  },
  // Twitter/X
  twitter: {
    name: "Twitter/X",
    width: 1280,
    height: 720,
    maxDuration: 140,
    maxSize: 512,
    fps: 30,
    videoBitrate: "5000k",
    audioBitrate: "128k",
    aspectRatio: "16:9",
  },
  // Facebook
  "facebook-feed": {
    name: "Facebook Feed",
    width: 1280,
    height: 720,
    maxDuration: 240,
    maxSize: 4000,
    fps: 30,
    videoBitrate: "4000k",
    audioBitrate: "128k",
    aspectRatio: "16:9",
  },
  "facebook-story": {
    name: "Facebook Story",
    width: 1080,
    height: 1920,
    maxDuration: 20,
    maxSize: 100,
    fps: 30,
    videoBitrate: "3500k",
    audioBitrate: "128k",
    aspectRatio: "9:16",
  },
  // WeChat
  wechat: {
    name: "微信视频号",
    width: 1080,
    height: 1920,
    maxDuration: 60,
    maxSize: 100,
    fps: 30,
    videoBitrate: "3500k",
    audioBitrate: "128k",
    aspectRatio: "9:16",
  },
  // Douyin (Chinese TikTok)
  douyin: {
    name: "抖音",
    width: 1080,
    height: 1920,
    maxDuration: 180,
    maxSize: 100,
    fps: 30,
    videoBitrate: "4000k",
    audioBitrate: "128k",
    aspectRatio: "9:16",
  },
};

export async function GET() {
  // Return available platforms
  return NextResponse.json({
    platforms: Object.entries(PLATFORM_PRESETS).map(([key, value]) => ({
      id: key,
      ...value,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const platform = formData.get("platform") as string;
    const cropMode = (formData.get("cropMode") as string) || "fit"; // fit, fill, crop

    if (!file) {
      return NextResponse.json(
        { error: "请上传视频文件" },
        { status: 400 }
      );
    }

    const preset = PLATFORM_PRESETS[platform];
    if (!preset) {
      return NextResponse.json(
        { error: "不支持的平台" },
        { status: 400 }
      );
    }

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempId = uuidv4();
    const inputPath = `/tmp/social_input_${tempId}.mp4`;
    const outputPath = `/tmp/social_output_${tempId}.mp4`;

    fs.writeFileSync(inputPath, buffer);

    try {
      // Get input video info
      const { stdout: probeOutput } = await execAsync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of json "${inputPath}"`
      );
      const probeData = JSON.parse(probeOutput);
      const inputWidth = probeData.streams[0].width;
      const inputHeight = probeData.streams[0].height;
      const inputDuration = parseFloat(probeData.streams[0].duration || "0");

      // Build filter for aspect ratio adjustment
      let scaleFilter: string;
      const targetWidth = preset.width;
      const targetHeight = preset.height;

      if (cropMode === "fill") {
        // Scale to fill and crop overflow
        scaleFilter = `scale=w='if(gt(a,${targetWidth}/${targetHeight}),${targetWidth},-2)':h='if(gt(a,${targetWidth}/${targetHeight}),-2,${targetHeight})',crop=${targetWidth}:${targetHeight}`;
      } else if (cropMode === "crop") {
        // Smart crop from center
        scaleFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}`;
      } else {
        // Fit with padding (letterbox/pillarbox)
        scaleFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`;
      }

      // Duration limit
      const durationLimit = Math.min(inputDuration, preset.maxDuration);
      const durationFlag = inputDuration > preset.maxDuration ? `-t ${preset.maxDuration}` : "";

      // Build FFmpeg command
      const command = `ffmpeg -i "${inputPath}" ${durationFlag} -vf "${scaleFilter}" -c:v libx264 -preset medium -b:v ${preset.videoBitrate} -maxrate ${preset.videoBitrate} -bufsize ${parseInt(preset.videoBitrate) * 2}k -r ${preset.fps} -c:a aac -b:a ${preset.audioBitrate} -ar 44100 -movflags +faststart "${outputPath}" -y`;

      await execAsync(command);

      // Read result
      const resultBuffer = fs.readFileSync(outputPath);

      return new NextResponse(resultBuffer, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${platform}_optimized.mp4"`,
          "Content-Length": resultBuffer.length.toString(),
          "X-Platform": preset.name,
          "X-Dimensions": `${preset.width}x${preset.height}`,
        },
      });
    } finally {
      // Clean up
      [inputPath, outputPath].forEach((p) => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
  } catch (error) {
    console.error("Social optimization error:", error);
    return NextResponse.json(
      { error: "视频优化失败" },
      { status: 500 }
    );
  }
}
