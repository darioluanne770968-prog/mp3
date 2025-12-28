import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// API Documentation endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    name: "Media Tools API",
    version: "1.0.0",
    description: "API for audio, video, and document processing",
    endpoints: {
      audio: {
        trim: {
          method: "POST",
          path: "/api/v1/audio/trim",
          description: "Trim audio file",
          params: {
            file: "Audio file (multipart/form-data)",
            start: "Start time in seconds",
            end: "End time in seconds",
          },
        },
        convert: {
          method: "POST",
          path: "/api/v1/audio/convert",
          description: "Convert audio format",
          params: {
            file: "Audio file (multipart/form-data)",
            format: "Target format (mp3, wav, ogg, flac, aac)",
            bitrate: "Output bitrate (optional)",
          },
        },
        merge: {
          method: "POST",
          path: "/api/v1/audio/merge",
          description: "Merge multiple audio files",
          params: {
            files: "Audio files array (multipart/form-data)",
          },
        },
      },
      video: {
        trim: {
          method: "POST",
          path: "/api/v1/video/trim",
          description: "Trim video file",
          params: {
            file: "Video file (multipart/form-data)",
            start: "Start time in seconds",
            end: "End time in seconds",
          },
        },
        convert: {
          method: "POST",
          path: "/api/v1/video/convert",
          description: "Convert video format",
          params: {
            file: "Video file (multipart/form-data)",
            format: "Target format (mp4, webm, avi, mkv, mov)",
            resolution: "Output resolution (optional)",
          },
        },
        compress: {
          method: "POST",
          path: "/api/v1/video/compress",
          description: "Compress video file",
          params: {
            file: "Video file (multipart/form-data)",
            quality: "Quality level (low, medium, high)",
          },
        },
      },
      image: {
        convert: {
          method: "POST",
          path: "/api/v1/image/convert",
          description: "Convert image format",
          params: {
            file: "Image file (multipart/form-data)",
            format: "Target format (png, jpg, webp, gif)",
          },
        },
        resize: {
          method: "POST",
          path: "/api/v1/image/resize",
          description: "Resize image",
          params: {
            file: "Image file (multipart/form-data)",
            width: "Target width",
            height: "Target height (optional)",
          },
        },
        removeBackground: {
          method: "POST",
          path: "/api/v1/image/remove-background",
          description: "Remove image background (PRO only)",
          params: {
            file: "Image file (multipart/form-data)",
          },
        },
      },
      ai: {
        speechToText: {
          method: "POST",
          path: "/api/v1/ai/speech-to-text",
          description: "Convert speech to text using Whisper (PRO only)",
          params: {
            file: "Audio file (multipart/form-data)",
            language: "Language code (optional, default: auto)",
          },
        },
      },
      task: {
        status: {
          method: "GET",
          path: "/api/v1/task/:id",
          description: "Get task status",
        },
        result: {
          method: "GET",
          path: "/api/v1/task/:id/download",
          description: "Download task result",
        },
      },
    },
    authentication: {
      type: "API Key",
      header: "X-API-Key",
      description: "Include your API key in the X-API-Key header",
    },
    rateLimits: {
      free: "10 requests per day",
      pro: "1000 requests per day",
      enterprise: "Unlimited",
    },
  });
}

// API Key validation middleware helper
export async function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return { valid: false, error: "API key required" };
  }

  const key = await prisma.apiKey.findUnique({
    where: { key: apiKey },
    include: { user: true },
  });

  if (!key) {
    return { valid: false, error: "Invalid API key" };
  }

  if (!key.enabled) {
    return { valid: false, error: "API key disabled" };
  }

  // Check rate limit (simple daily limit)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (key.requests >= key.rateLimit) {
    return { valid: false, error: "Rate limit exceeded" };
  }

  // Update usage
  await prisma.apiKey.update({
    where: { id: key.id },
    data: {
      requests: { increment: 1 },
      lastUsed: new Date(),
    },
  });

  return { valid: true, user: key.user, apiKey: key };
}
