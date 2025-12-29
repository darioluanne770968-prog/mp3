import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testWebhook } from "@/lib/webhook";

export async function POST(request: NextRequest) {
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

    const success = await testWebhook(id);

    return NextResponse.json({
      success,
      message: success ? "测试成功" : "测试失败，请检查 URL 和服务器配置",
    });
  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json(
      { error: "测试 Webhook 失败" },
      { status: 500 }
    );
  }
}
