import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Join team via invite code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json(
        { error: "请提供邀请码" },
        { status: 400 }
      );
    }

    // Find team by invite code
    const team = await prisma.team.findUnique({
      where: { inviteCode },
    });

    if (!team) {
      return NextResponse.json(
        { error: "邀请码无效" },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: team.id,
        userId: (session.user as any).id,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "您已经是此团队成员" },
        { status: 400 }
      );
    }

    // Join team
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: (session.user as any).id,
        role: "MEMBER",
      },
    });

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
      },
      message: "已成功加入团队",
    });
  } catch (error) {
    console.error("Team join error:", error);
    return NextResponse.json(
      { error: "加入团队失败" },
      { status: 500 }
    );
  }
}

// Regenerate invite code
export async function PUT(request: NextRequest) {
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

    // Check admin permission
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

    const crypto = await import("crypto");
    const newInviteCode = crypto.randomBytes(8).toString("hex");

    await prisma.team.update({
      where: { id: teamId },
      data: { inviteCode: newInviteCode },
    });

    return NextResponse.json({
      success: true,
      inviteCode: newInviteCode,
    });
  } catch (error) {
    console.error("Invite code regenerate error:", error);
    return NextResponse.json(
      { error: "重新生成邀请码失败" },
      { status: 500 }
    );
  }
}
