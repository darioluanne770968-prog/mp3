import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface VideoFilter {
  name: string;
  label: string;
  description: string;
  ffmpegFilter: string;
  params?: Record<string, { type: string; default: any; min?: number; max?: number }>;
}

// Available video filters
export const videoFilters: VideoFilter[] = [
  {
    name: "grayscale",
    label: "黑白",
    description: "将视频转换为黑白",
    ffmpegFilter: "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3",
  },
  {
    name: "sepia",
    label: "复古褐色",
    description: "添加复古褐色调",
    ffmpegFilter: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
  },
  {
    name: "negative",
    label: "负片",
    description: "反转颜色",
    ffmpegFilter: "negate",
  },
  {
    name: "blur",
    label: "模糊",
    description: "添加高斯模糊效果",
    ffmpegFilter: "boxblur=5:1",
    params: {
      strength: { type: "number", default: 5, min: 1, max: 20 },
    },
  },
  {
    name: "sharpen",
    label: "锐化",
    description: "增强图像细节",
    ffmpegFilter: "unsharp=5:5:1.0:5:5:0.0",
  },
  {
    name: "brightness",
    label: "亮度调整",
    description: "调整视频亮度",
    ffmpegFilter: "eq=brightness=0.1",
    params: {
      value: { type: "number", default: 0.1, min: -1, max: 1 },
    },
  },
  {
    name: "contrast",
    label: "对比度",
    description: "调整视频对比度",
    ffmpegFilter: "eq=contrast=1.5",
    params: {
      value: { type: "number", default: 1.5, min: 0, max: 3 },
    },
  },
  {
    name: "saturation",
    label: "饱和度",
    description: "调整颜色饱和度",
    ffmpegFilter: "eq=saturation=1.5",
    params: {
      value: { type: "number", default: 1.5, min: 0, max: 3 },
    },
  },
  {
    name: "vignette",
    label: "暗角",
    description: "添加暗角效果",
    ffmpegFilter: "vignette=PI/4",
  },
  {
    name: "vintage",
    label: "怀旧",
    description: "复古电影效果",
    ffmpegFilter: "curves=vintage",
  },
  {
    name: "warmth",
    label: "暖色调",
    description: "添加暖色调",
    ffmpegFilter: "colorbalance=rs=.1:gs=-.1:bs=-.1:rm=.1:gm=-.1:bm=-.1",
  },
  {
    name: "cool",
    label: "冷色调",
    description: "添加冷色调",
    ffmpegFilter: "colorbalance=rs=-.1:gs=.1:bs=.1:rm=-.1:gm=.1:bm=.1",
  },
  {
    name: "edge",
    label: "边缘检测",
    description: "突出显示边缘",
    ffmpegFilter: "edgedetect=mode=colormix",
  },
  {
    name: "emboss",
    label: "浮雕",
    description: "浮雕效果",
    ffmpegFilter: "convolution='-2 -1 0 -1 1 1 0 1 2:-2 -1 0 -1 1 1 0 1 2:-2 -1 0 -1 1 1 0 1 2'",
  },
  {
    name: "mirror",
    label: "镜像",
    description: "水平镜像",
    ffmpegFilter: "hflip",
  },
  {
    name: "flip",
    label: "翻转",
    description: "垂直翻转",
    ffmpegFilter: "vflip",
  },
];

// Video transitions
export interface VideoTransition {
  name: string;
  label: string;
  description: string;
  duration: number;
}

export const videoTransitions: VideoTransition[] = [
  {
    name: "fade",
    label: "淡入淡出",
    description: "平滑的淡入淡出效果",
    duration: 1,
  },
  {
    name: "dissolve",
    label: "溶解",
    description: "交叉溶解效果",
    duration: 1,
  },
  {
    name: "wipeleft",
    label: "左擦除",
    description: "从右向左擦除",
    duration: 1,
  },
  {
    name: "wiperight",
    label: "右擦除",
    description: "从左向右擦除",
    duration: 1,
  },
  {
    name: "wipeup",
    label: "上擦除",
    description: "从下向上擦除",
    duration: 1,
  },
  {
    name: "wipedown",
    label: "下擦除",
    description: "从上向下擦除",
    duration: 1,
  },
  {
    name: "slideleft",
    label: "左滑动",
    description: "向左滑动",
    duration: 1,
  },
  {
    name: "slideright",
    label: "右滑动",
    description: "向右滑动",
    duration: 1,
  },
  {
    name: "circleopen",
    label: "圆形展开",
    description: "从中心向外圆形展开",
    duration: 1,
  },
  {
    name: "circleclose",
    label: "圆形收缩",
    description: "向中心圆形收缩",
    duration: 1,
  },
];

// Apply filter to video
export async function applyVideoFilter(
  inputPath: string,
  outputPath: string,
  filterName: string,
  params?: Record<string, any>
): Promise<void> {
  const filter = videoFilters.find((f) => f.name === filterName);
  if (!filter) {
    throw new Error(`Unknown filter: ${filterName}`);
  }

  let ffmpegFilter = filter.ffmpegFilter;

  // Apply custom params
  if (params && filter.params) {
    Object.entries(params).forEach(([key, value]) => {
      if (filter.params?.[key]) {
        ffmpegFilter = ffmpegFilter.replace(
          new RegExp(`${key}=[\\d.]+`),
          `${key}=${value}`
        );
      }
    });
  }

  const command = `ffmpeg -i "${inputPath}" -vf "${ffmpegFilter}" -c:a copy "${outputPath}" -y`;
  await execAsync(command);
}

// Apply multiple filters
export async function applyVideoFilters(
  inputPath: string,
  outputPath: string,
  filterNames: string[],
  params?: Record<string, Record<string, any>>
): Promise<void> {
  const filters = filterNames
    .map((name) => {
      const filter = videoFilters.find((f) => f.name === name);
      if (!filter) return null;

      let ffmpegFilter = filter.ffmpegFilter;
      if (params?.[name] && filter.params) {
        Object.entries(params[name]).forEach(([key, value]) => {
          ffmpegFilter = ffmpegFilter.replace(
            new RegExp(`${key}=[\\d.]+`),
            `${key}=${value}`
          );
        });
      }
      return ffmpegFilter;
    })
    .filter(Boolean)
    .join(",");

  if (!filters) {
    throw new Error("No valid filters specified");
  }

  const command = `ffmpeg -i "${inputPath}" -vf "${filters}" -c:a copy "${outputPath}" -y`;
  await execAsync(command);
}

// Apply transition between two videos
export async function applyTransition(
  video1Path: string,
  video2Path: string,
  outputPath: string,
  transitionName: string,
  duration: number = 1
): Promise<void> {
  const transition = videoTransitions.find((t) => t.name === transitionName);
  if (!transition) {
    throw new Error(`Unknown transition: ${transitionName}`);
  }

  // Use xfade filter for transitions
  const command = `ffmpeg -i "${video1Path}" -i "${video2Path}" -filter_complex "xfade=transition=${transitionName}:duration=${duration}:offset=auto" "${outputPath}" -y`;
  await execAsync(command);
}

// Get video duration
export async function getVideoDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

// Generate video thumbnail
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  time: number = 0
): Promise<void> {
  const command = `ffmpeg -i "${videoPath}" -ss ${time} -vframes 1 -q:v 2 "${outputPath}" -y`;
  await execAsync(command);
}

// Extract frame at specific time
export async function extractFrame(
  videoPath: string,
  outputPath: string,
  time: number
): Promise<void> {
  const command = `ffmpeg -i "${videoPath}" -ss ${time} -vframes 1 "${outputPath}" -y`;
  await execAsync(command);
}
