import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

function generateApiKey(): string {
  return `mt_${crypto.randomBytes(32).toString("hex")}`;
}

// Create API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { name, rateLimit } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "请提供 API Key 名称" },
        { status: 400 }
      );
    }

    // Check user role for rate limit
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    // Limit number of API keys per user
    const existingKeys = await prisma.apiKey.count({
      where: { userId: (session.user as any).id },
    });

    const maxKeys = user?.role === "ADMIN" ? 10 : user?.role === "PRO" ? 5 : 2;
    if (existingKeys >= maxKeys) {
      return NextResponse.json(
        { error: `最多只能创建 ${maxKeys} 个 API Key` },
        { status: 400 }
      );
    }

    // Generate API key
    const key = generateApiKey();

    // Determine rate limit based on user role
    const defaultRateLimit = user?.role === "ADMIN" ? 10000 : user?.role === "PRO" ? 1000 : 100;

    const apiKey = await prisma.apiKey.create({
      data: {
        key,
        name,
        rateLimit: rateLimit || defaultRateLimit,
        userId: (session.user as any).id,
      },
      select: {
        id: true,
        key: true,
        name: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      apiKey,
      message: "请妥善保存此 API Key，它只会显示一次",
    });
  } catch (error) {
    console.error("API key creation error:", error);
    return NextResponse.json(
      { error: "创建 API Key 失败" },
      { status: 500 }
    );
  }
}

// List API keys
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: (session.user as any).id },
      select: {
        id: true,
        name: true,
        key: true,
        rateLimit: true,
        requests: true,
        enabled: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Mask API keys (show only first and last 4 characters)
    const maskedKeys = apiKeys.map((key) => ({
      ...key,
      key: `${key.key.slice(0, 6)}...${key.key.slice(-4)}`,
    }));

    return NextResponse.json({ apiKeys: maskedKeys });
  } catch (error) {
    console.error("API key list error:", error);
    return NextResponse.json(
      { error: "获取 API Key 列表失败" },
      { status: 500 }
    );
  }
}

// Delete API key
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "请提供 API Key ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey || apiKey.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: "API Key 不存在" },
        { status: 404 }
      );
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "API Key 已删除",
    });
  } catch (error) {
    console.error("API key delete error:", error);
    return NextResponse.json(
      { error: "删除 API Key 失败" },
      { status: 500 }
    );
  }
}
