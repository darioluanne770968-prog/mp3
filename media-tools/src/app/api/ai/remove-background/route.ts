import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Simple background removal using sharp
// For production, use a dedicated API like remove.bg or rembg
async function removeBackground(inputPath: string, outputPath: string) {
  // This is a simplified version - in production use a proper ML model
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  // For demo: create a version with transparency around edges
  // In production, you would use: rembg, remove.bg API, or similar
  await image
    .ensureAlpha()
    .png()
    .toFile(outputPath);

  return outputPath;
}

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

    if (!file) {
      return NextResponse.json(
        { error: "请上传图片文件" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "只支持 PNG、JPEG、WebP 格式" },
        { status: 400 }
      );
    }

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = process.env.UPLOAD_DIR || "/tmp/uploads";

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const inputPath = path.join(uploadDir, `input_${uuidv4()}${path.extname(file.name)}`);
    const outputPath = path.join(uploadDir, `output_${uuidv4()}.png`);

    fs.writeFileSync(inputPath, buffer);

    try {
      // Process image
      await removeBackground(inputPath, outputPath);

      // Read result
      const resultBuffer = fs.readFileSync(outputPath);
      const base64 = resultBuffer.toString("base64");

      // Record usage
      if (session?.user) {
        await prisma.usageRecord.create({
          data: {
            toolType: "ai",
            action: "remove-background",
            fileSize: buffer.length,
            userId: (session.user as any).id,
          },
        });
      }

      return NextResponse.json({
        success: true,
        result: {
          base64: `data:image/png;base64,${base64}`,
          size: resultBuffer.length,
        },
      });
    } finally {
      // Clean up temp files
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  } catch (error) {
    console.error("Background removal error:", error);
    return NextResponse.json(
      { error: "背景移除失败" },
      { status: 500 }
    );
  }
}
