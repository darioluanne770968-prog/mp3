import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// List templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const toolType = searchParams.get("toolType");
    const isPublic = searchParams.get("public") === "true";

    const where: any = {};

    if (isPublic) {
      where.isPublic = true;
    } else if (session?.user) {
      where.OR = [
        { userId: (session.user as any).id },
        { isPublic: true },
      ];
    } else {
      where.isPublic = true;
    }

    if (toolType) {
      where.toolType = toolType;
    }

    const templates = await prisma.template.findMany({
      where,
      include: {
        user: {
          select: { name: true, image: true },
        },
        _count: {
          select: { uses: true },
        },
      },
      orderBy: [
        { uses: { _count: "desc" } },
        { createdAt: "desc" },
      ],
      take: 50,
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Template list error:", error);
    return NextResponse.json(
      { error: "获取模板列表失败" },
      { status: 500 }
    );
  }
}

// Create template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { name, description, toolType, settings, isPublic } = await request.json();

    if (!name || !toolType || !settings) {
      return NextResponse.json(
        { error: "请提供模板名称、工具类型和设置" },
        { status: 400 }
      );
    }

    const template = await prisma.template.create({
      data: {
        name,
        description,
        toolType,
        settings,
        isPublic: isPublic || false,
        userId: (session.user as any).id,
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Template create error:", error);
    return NextResponse.json(
      { error: "创建模板失败" },
      { status: 500 }
    );
  }
}

// Update template
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id, name, description, settings, isPublic } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "请提供模板ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template || template.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: "模板不存在或无权限" },
        { status: 404 }
      );
    }

    const updated = await prisma.template.update({
      where: { id },
      data: { name, description, settings, isPublic },
    });

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (error) {
    console.error("Template update error:", error);
    return NextResponse.json(
      { error: "更新模板失败" },
      { status: 500 }
    );
  }
}

// Delete template
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
        { error: "请提供模板ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template || template.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: "模板不存在或无权限" },
        { status: 404 }
      );
    }

    await prisma.template.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "模板已删除",
    });
  } catch (error) {
    console.error("Template delete error:", error);
    return NextResponse.json(
      { error: "删除模板失败" },
      { status: 500 }
    );
  }
}
