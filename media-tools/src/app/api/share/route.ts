import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { fileId, password, maxDownloads, expiresInHours } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "请提供文件ID" },
        { status: 400 }
      );
    }

    // Verify file exists and belongs to user (if logged in)
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json(
        { error: "文件不存在" },
        { status: 404 }
      );
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Calculate expiration
    let expiresAt = null;
    if (expiresInHours) {
      expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    }

    // Create share link
    const share = await prisma.share.create({
      data: {
        fileId,
        password: hashedPassword,
        maxDownloads,
        expiresAt,
        userId: session?.user ? (session.user as any).id : null,
      },
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/share/${share.token}`;

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        token: share.token,
        url: shareUrl,
        hasPassword: !!password,
        maxDownloads,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Share creation error:", error);
    return NextResponse.json(
      { error: "创建分享链接失败" },
      { status: 500 }
    );
  }
}
