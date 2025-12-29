import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWebhook, testWebhook, WEBHOOK_EVENTS } from "@/lib/webhook";
import crypto from "crypto";

// List webhooks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const webhooks = await prisma.webhook.findMany({
      where: { userId: (session.user as any).id },
      include: {
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Mask secrets
    const maskedWebhooks = webhooks.map((wh) => ({
      ...wh,
      secret: `${wh.secret.slice(0, 8)}...`,
    }));

    return NextResponse.json({
      webhooks: maskedWebhooks,
      availableEvents: Object.values(WEBHOOK_EVENTS),
    });
  } catch (error) {
    console.error("Webhook list error:", error);
    return NextResponse.json(
      { error: "获取 Webhook 列表失败" },
      { status: 500 }
    );
  }
}

// Create webhook
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { url, events } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "请提供 Webhook URL" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "无效的 URL" },
        { status: 400 }
      );
    }

    // Check webhook limit
    const existingCount = await prisma.webhook.count({
      where: { userId: (session.user as any).id },
    });

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: "最多只能创建 10 个 Webhook" },
        { status: 400 }
      );
    }

    const webhook = await createWebhook(
      (session.user as any).id,
      url,
      events || Object.values(WEBHOOK_EVENTS)
    );

    return NextResponse.json({
      success: true,
      webhook,
      message: "请妥善保存 Secret，它只会显示一次",
    });
  } catch (error) {
    console.error("Webhook create error:", error);
    return NextResponse.json(
      { error: "创建 Webhook 失败" },
      { status: 500 }
    );
  }
}

// Update webhook
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id, url, events, enabled } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "请提供 Webhook ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook || webhook.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: "Webhook 不存在" },
        { status: 404 }
      );
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        url: url || webhook.url,
        events: events || webhook.events,
        enabled: enabled !== undefined ? enabled : webhook.enabled,
      },
    });

    return NextResponse.json({
      success: true,
      webhook: {
        ...updated,
        secret: `${updated.secret.slice(0, 8)}...`,
      },
    });
  } catch (error) {
    console.error("Webhook update error:", error);
    return NextResponse.json(
      { error: "更新 Webhook 失败" },
      { status: 500 }
    );
  }
}

// Delete webhook
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
        { error: "请提供 Webhook ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook || webhook.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: "Webhook 不存在" },
        { status: 404 }
      );
    }

    await prisma.webhook.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Webhook 已删除",
    });
  } catch (error) {
    console.error("Webhook delete error:", error);
    return NextResponse.json(
      { error: "删除 Webhook 失败" },
      { status: 500 }
    );
  }
}
