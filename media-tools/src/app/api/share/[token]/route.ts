import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("password");

    const share = await prisma.share.findUnique({
      where: { token },
      include: { file: true },
    });

    if (!share) {
      return NextResponse.json(
        { error: "分享链接不存在" },
        { status: 404 }
      );
    }

    // Check expiration
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json(
        { error: "分享链接已过期" },
        { status: 410 }
      );
    }

    // Check download limit
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return NextResponse.json(
        { error: "下载次数已达上限" },
        { status: 410 }
      );
    }

    // Check password if required
    if (share.password) {
      if (!password) {
        return NextResponse.json(
          { error: "需要密码", requirePassword: true },
          { status: 401 }
        );
      }

      const isValid = await bcrypt.compare(password, share.password);
      if (!isValid) {
        return NextResponse.json(
          { error: "密码错误" },
          { status: 401 }
        );
      }
    }

    // Get file info without downloading
    return NextResponse.json({
      file: {
        name: share.file.originalName,
        size: share.file.size,
        mimeType: share.file.mimeType,
        duration: share.file.duration,
      },
      share: {
        downloads: share.downloads,
        maxDownloads: share.maxDownloads,
        expiresAt: share.expiresAt,
      },
    });
  } catch (error) {
    console.error("Share access error:", error);
    return NextResponse.json(
      { error: "获取分享信息失败" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { password } = await request.json().catch(() => ({}));

    const share = await prisma.share.findUnique({
      where: { token },
      include: { file: true },
    });

    if (!share) {
      return NextResponse.json(
        { error: "分享链接不存在" },
        { status: 404 }
      );
    }

    // Check expiration
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json(
        { error: "分享链接已过期" },
        { status: 410 }
      );
    }

    // Check download limit
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return NextResponse.json(
        { error: "下载次数已达上限" },
        { status: 410 }
      );
    }

    // Check password if required
    if (share.password) {
      if (!password) {
        return NextResponse.json(
          { error: "需要密码", requirePassword: true },
          { status: 401 }
        );
      }

      const isValid = await bcrypt.compare(password, share.password);
      if (!isValid) {
        return NextResponse.json(
          { error: "密码错误" },
          { status: 401 }
        );
      }
    }

    // Increment download count
    await prisma.share.update({
      where: { id: share.id },
      data: { downloads: { increment: 1 } },
    });

    // Read and return file
    const filePath = share.file.storagePath;

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "文件不存在" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": share.file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(share.file.originalName)}"`,
        "Content-Length": share.file.size.toString(),
      },
    });
  } catch (error) {
    console.error("Share download error:", error);
    return NextResponse.json(
      { error: "下载失败" },
      { status: 500 }
    );
  }
}
