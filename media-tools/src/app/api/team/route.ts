import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// List user's teams
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const teams = await prisma.teamMember.findMany({
      where: { userId: (session.user as any).id },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            },
            _count: {
              select: { projects: true, files: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      teams: teams.map((tm) => ({
        ...tm.team,
        role: tm.role,
        joinedAt: tm.joinedAt,
      })),
    });
  } catch (error) {
    console.error("Team list error:", error);
    return NextResponse.json(
      { error: "获取团队列表失败" },
      { status: 500 }
    );
  }
}

// Create team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "请提供团队名称" },
        { status: 400 }
      );
    }

    // Check team limit
    const existingCount = await prisma.teamMember.count({
      where: {
        userId: (session.user as any).id,
        role: "OWNER",
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    const maxTeams = user?.role === "ADMIN" ? 100 : user?.role === "PRO" ? 10 : 3;

    if (existingCount >= maxTeams) {
      return NextResponse.json(
        { error: `最多只能创建 ${maxTeams} 个团队` },
        { status: 400 }
      );
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        description,
        inviteCode: crypto.randomBytes(8).toString("hex"),
        members: {
          create: {
            userId: (session.user as any).id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      team,
    });
  } catch (error) {
    console.error("Team create error:", error);
    return NextResponse.json(
      { error: "创建团队失败" },
      { status: 500 }
    );
  }
}

// Update team
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { teamId, name, description } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "请提供团队ID" },
        { status: 400 }
      );
    }

    // Check ownership
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: (session.user as any).id,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "无权限修改此团队" },
        { status: 403 }
      );
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { name, description },
    });

    return NextResponse.json({
      success: true,
      team,
    });
  } catch (error) {
    console.error("Team update error:", error);
    return NextResponse.json(
      { error: "更新团队失败" },
      { status: 500 }
    );
  }
}

// Delete team
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "请提供团队ID" },
        { status: 400 }
      );
    }

    // Check ownership
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: (session.user as any).id,
        role: "OWNER",
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "只有所有者可以删除团队" },
        { status: 403 }
      );
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    return NextResponse.json({
      success: true,
      message: "团队已删除",
    });
  } catch (error) {
    console.error("Team delete error:", error);
    return NextResponse.json(
      { error: "删除团队失败" },
      { status: 500 }
    );
  }
}
