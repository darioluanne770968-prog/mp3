import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// List projects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    const projects = await prisma.project.findMany({
      where: teamId
        ? { teamId }
        : { userId: (session.user as any).id },
      include: {
        _count: {
          select: { files: true, tasks: true },
        },
        user: {
          select: { name: true, image: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Project list error:", error);
    return NextResponse.json(
      { error: "获取项目列表失败" },
      { status: 500 }
    );
  }
}

// Create project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { name, description, teamId, settings } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "请提供项目名称" },
        { status: 400 }
      );
    }

    // If teamId provided, verify membership
    if (teamId) {
      const member = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: (session.user as any).id,
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: "您不是此团队成员" },
          { status: 403 }
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        settings: settings || {},
        userId: (session.user as any).id,
        teamId,
      },
    });

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Project create error:", error);
    return NextResponse.json(
      { error: "创建项目失败" },
      { status: 500 }
    );
  }
}

// Update project
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id, name, description, settings } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "请提供项目ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: "项目不存在或无权限" },
        { status: 404 }
      );
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { name, description, settings },
    });

    return NextResponse.json({
      success: true,
      project: updated,
    });
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json(
      { error: "更新项目失败" },
      { status: 500 }
    );
  }
}

// Delete project
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
        { error: "请提供项目ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: "项目不存在或无权限" },
        { status: 404 }
      );
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "项目已删除",
    });
  } catch (error) {
    console.error("Project delete error:", error);
    return NextResponse.json(
      { error: "删除项目失败" },
      { status: 500 }
    );
  }
}
