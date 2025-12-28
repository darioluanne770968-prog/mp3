import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const CHUNK_DIR = process.env.CHUNK_DIR || "/tmp/chunks";

// Initialize upload - returns uploadId
export async function POST(request: NextRequest) {
  try {
    const { fileName, fileSize, totalChunks, mimeType } = await request.json();

    if (!fileName || !fileSize || !totalChunks) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const uploadId = uuidv4();
    const uploadDir = path.join(CHUNK_DIR, uploadId);

    // Create upload directory
    fs.mkdirSync(uploadDir, { recursive: true });

    // Save upload metadata
    const metadata = {
      fileName,
      fileSize,
      totalChunks,
      mimeType,
      uploadedChunks: [],
      createdAt: new Date().toISOString(),
      userId: session?.user ? (session.user as any).id : null,
    };

    fs.writeFileSync(
      path.join(uploadDir, "metadata.json"),
      JSON.stringify(metadata)
    );

    return NextResponse.json({
      success: true,
      uploadId,
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
    });
  } catch (error) {
    console.error("Upload init error:", error);
    return NextResponse.json(
      { error: "初始化上传失败" },
      { status: 500 }
    );
  }
}

// Upload chunk
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chunk = formData.get("chunk") as File;
    const uploadId = formData.get("uploadId") as string;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);

    if (!chunk || !uploadId || isNaN(chunkIndex)) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(CHUNK_DIR, uploadId);
    const metadataPath = path.join(uploadDir, "metadata.json");

    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json(
        { error: "上传会话不存在" },
        { status: 404 }
      );
    }

    // Read metadata
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

    // Save chunk
    const bytes = await chunk.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(path.join(uploadDir, `chunk_${chunkIndex}`), buffer);

    // Update metadata
    if (!metadata.uploadedChunks.includes(chunkIndex)) {
      metadata.uploadedChunks.push(chunkIndex);
      metadata.uploadedChunks.sort((a: number, b: number) => a - b);
    }
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));

    const isComplete = metadata.uploadedChunks.length === metadata.totalChunks;

    return NextResponse.json({
      success: true,
      chunkIndex,
      uploadedChunks: metadata.uploadedChunks.length,
      totalChunks: metadata.totalChunks,
      isComplete,
    });
  } catch (error) {
    console.error("Chunk upload error:", error);
    return NextResponse.json(
      { error: "分片上传失败" },
      { status: 500 }
    );
  }
}

// Complete upload - merge chunks
export async function PATCH(request: NextRequest) {
  try {
    const { uploadId } = await request.json();

    if (!uploadId) {
      return NextResponse.json(
        { error: "缺少上传ID" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(CHUNK_DIR, uploadId);
    const metadataPath = path.join(uploadDir, "metadata.json");

    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json(
        { error: "上传会话不存在" },
        { status: 404 }
      );
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

    // Check if all chunks are uploaded
    if (metadata.uploadedChunks.length !== metadata.totalChunks) {
      return NextResponse.json(
        {
          error: "还有分片未上传",
          uploadedChunks: metadata.uploadedChunks.length,
          totalChunks: metadata.totalChunks,
        },
        { status: 400 }
      );
    }

    // Merge chunks
    const outputDir = process.env.UPLOAD_DIR || "/tmp/uploads";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const ext = path.extname(metadata.fileName);
    const outputPath = path.join(outputDir, `${uuidv4()}${ext}`);
    const writeStream = fs.createWriteStream(outputPath);

    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunkPath = path.join(uploadDir, `chunk_${i}`);
      const chunkData = fs.readFileSync(chunkPath);
      writeStream.write(chunkData);
    }

    writeStream.end();

    // Wait for write to complete
    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Clean up chunks
    fs.rmSync(uploadDir, { recursive: true });

    return NextResponse.json({
      success: true,
      file: {
        path: outputPath,
        name: metadata.fileName,
        size: metadata.fileSize,
        mimeType: metadata.mimeType,
      },
    });
  } catch (error) {
    console.error("Merge chunks error:", error);
    return NextResponse.json(
      { error: "合并文件失败" },
      { status: 500 }
    );
  }
}

// Get upload status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json(
        { error: "缺少上传ID" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(CHUNK_DIR, uploadId);
    const metadataPath = path.join(uploadDir, "metadata.json");

    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json(
        { error: "上传会话不存在" },
        { status: 404 }
      );
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

    return NextResponse.json({
      uploadId,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      uploadedChunks: metadata.uploadedChunks,
      totalChunks: metadata.totalChunks,
      progress: Math.round(
        (metadata.uploadedChunks.length / metadata.totalChunks) * 100
      ),
    });
  } catch (error) {
    console.error("Get upload status error:", error);
    return NextResponse.json(
      { error: "获取上传状态失败" },
      { status: 500 }
    );
  }
}
