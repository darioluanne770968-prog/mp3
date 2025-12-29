import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: (session.user as any).id },
      });

      if (user?.role !== "PRO" && user?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "AI 功能仅限 PRO 用户使用" },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const language = (formData.get("language") as string) || "auto";
    const outputFormat = (formData.get("format") as string) || "text";

    if (!file) {
      return NextResponse.json(
        { error: "请上传图片文件" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "只支持 PNG、JPEG、WebP、GIF 格式" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // Use GPT-4 Vision for OCR
    const languagePrompt = language !== "auto"
      ? `The text is in ${language}. `
      : "";

    let prompt = `${languagePrompt}Please extract all text from this image accurately. `;

    if (outputFormat === "structured") {
      prompt += "Return the result as a JSON object with the following structure: { \"blocks\": [{ \"text\": \"...\", \"type\": \"heading|paragraph|list|table\" }] }";
    } else if (outputFormat === "markdown") {
      prompt += "Format the extracted text as Markdown, preserving the original structure (headings, lists, tables, etc.).";
    } else {
      prompt += "Return the plain text only, preserving line breaks.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const extractedText = response.choices[0]?.message?.content || "";

    // Record usage
    if (session?.user) {
      await prisma.usageRecord.create({
        data: {
          toolType: "ai",
          action: "ocr",
          fileSize: buffer.length,
          userId: (session.user as any).id,
        },
      });
    }

    // Return based on format
    if (outputFormat === "structured") {
      try {
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return NextResponse.json({
            success: true,
            result: JSON.parse(jsonMatch[0]),
          });
        }
      } catch {
        // Fall through to text response
      }
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      format: outputFormat,
    });
  } catch (error: any) {
    console.error("OCR error:", error);

    if (error?.code === "insufficient_quota") {
      return NextResponse.json(
        { error: "API 配额不足" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "文字识别失败" },
      { status: 500 }
    );
  }
}
