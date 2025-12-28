import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_PATH = process.env.FFPROBE_PATH || "ffprobe";

export interface MediaInfo {
  duration: number;
  format: string;
  bitrate: number;
  size: number;
  audioStreams: AudioStream[];
  videoStreams: VideoStream[];
}

export interface AudioStream {
  index: number;
  codec: string;
  sampleRate: number;
  channels: number;
  bitrate: number;
}

export interface VideoStream {
  index: number;
  codec: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}

export async function getMediaInfo(filePath: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      filePath
    ];

    const proc = spawn(FFPROBE_PATH, args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr}`));
        return;
      }

      try {
        const info = JSON.parse(stdout);
        const format = info.format || {};
        const streams = info.streams || [];

        const audioStreams: AudioStream[] = streams
          .filter((s: Record<string, unknown>) => s.codec_type === "audio")
          .map((s: Record<string, unknown>) => ({
            index: s.index as number,
            codec: s.codec_name as string,
            sampleRate: parseInt(s.sample_rate as string) || 0,
            channels: s.channels as number,
            bitrate: parseInt(s.bit_rate as string) || 0,
          }));

        const videoStreams: VideoStream[] = streams
          .filter((s: Record<string, unknown>) => s.codec_type === "video")
          .map((s: Record<string, unknown>) => ({
            index: s.index as number,
            codec: s.codec_name as string,
            width: s.width as number,
            height: s.height as number,
            fps: eval(s.r_frame_rate as string) || 0,
            bitrate: parseInt(s.bit_rate as string) || 0,
          }));

        resolve({
          duration: parseFloat(format.duration) || 0,
          format: format.format_name || "",
          bitrate: parseInt(format.bit_rate) || 0,
          size: parseInt(format.size) || 0,
          audioStreams,
          videoStreams,
        });
      } catch (e) {
        reject(new Error(`Failed to parse ffprobe output: ${e}`));
      }
    });
  });
}

export interface FFmpegOptions {
  onProgress?: (progress: number) => void;
}

export async function runFFmpeg(
  args: string[],
  totalDuration?: number,
  options?: FFmpegOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, ["-y", ...args, "-progress", "pipe:2"]);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();

      if (totalDuration && options?.onProgress) {
        const match = stderr.match(/out_time_ms=(\d+)/);
        if (match) {
          const currentMs = parseInt(match[1]) / 1000000;
          const progress = Math.min(100, Math.round((currentMs / totalDuration) * 100));
          options.onProgress(progress);
        }
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}

// Audio processing functions
export async function trimAudio(
  input: string,
  output: string,
  start: number,
  end: number,
  options?: FFmpegOptions
): Promise<void> {
  const duration = end - start;
  await runFFmpeg([
    "-i", input,
    "-ss", start.toString(),
    "-t", duration.toString(),
    "-c", "copy",
    output
  ], duration, options);
}

export async function mergeAudio(
  inputs: string[],
  output: string,
  options?: FFmpegOptions
): Promise<void> {
  const listFile = output + ".txt";
  const content = inputs.map(f => `file '${f}'`).join("\n");
  await fs.writeFile(listFile, content);

  try {
    await runFFmpeg([
      "-f", "concat",
      "-safe", "0",
      "-i", listFile,
      "-c", "copy",
      output
    ], undefined, options);
  } finally {
    await fs.unlink(listFile).catch(() => {});
  }
}

export async function adjustVolume(
  input: string,
  output: string,
  volume: number,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  await runFFmpeg([
    "-i", input,
    "-af", `volume=${volume}`,
    output
  ], info.duration, options);
}

export async function changeSpeed(
  input: string,
  output: string,
  speed: number,
  isVideo: boolean = false,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  const newDuration = info.duration / speed;

  if (isVideo) {
    await runFFmpeg([
      "-i", input,
      "-filter_complex", `[0:v]setpts=${1/speed}*PTS[v];[0:a]atempo=${speed}[a]`,
      "-map", "[v]",
      "-map", "[a]",
      output
    ], newDuration, options);
  } else {
    await runFFmpeg([
      "-i", input,
      "-af", `atempo=${speed}`,
      output
    ], newDuration, options);
  }
}

export async function changePitch(
  input: string,
  output: string,
  semitones: number,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  const ratio = Math.pow(2, semitones / 12);
  await runFFmpeg([
    "-i", input,
    "-af", `asetrate=44100*${ratio},aresample=44100`,
    output
  ], info.duration, options);
}

export async function applyEqualizer(
  input: string,
  output: string,
  bass: number,
  mid: number,
  treble: number,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  await runFFmpeg([
    "-i", input,
    "-af", `equalizer=f=100:width_type=o:width=2:g=${bass},equalizer=f=1000:width_type=o:width=2:g=${mid},equalizer=f=8000:width_type=o:width=2:g=${treble}`,
    output
  ], info.duration, options);
}

export async function reverseAudio(
  input: string,
  output: string,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  await runFFmpeg([
    "-i", input,
    "-af", "areverse",
    output
  ], info.duration, options);
}

export async function createRingtone(
  input: string,
  output: string,
  start: number,
  duration: number,
  fadeIn: number,
  fadeOut: number,
  options?: FFmpegOptions
): Promise<void> {
  const filters = [];
  if (fadeIn > 0) filters.push(`afade=t=in:st=0:d=${fadeIn}`);
  if (fadeOut > 0) filters.push(`afade=t=out:st=${duration - fadeOut}:d=${fadeOut}`);

  await runFFmpeg([
    "-i", input,
    "-ss", start.toString(),
    "-t", duration.toString(),
    ...(filters.length ? ["-af", filters.join(",")] : []),
    output
  ], duration, options);
}

// Video processing functions
export async function trimVideo(
  input: string,
  output: string,
  start: number,
  end: number,
  options?: FFmpegOptions
): Promise<void> {
  const duration = end - start;
  await runFFmpeg([
    "-i", input,
    "-ss", start.toString(),
    "-t", duration.toString(),
    "-c", "copy",
    output
  ], duration, options);
}

export async function cropVideo(
  input: string,
  output: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  await runFFmpeg([
    "-i", input,
    "-vf", `crop=${width}:${height}:${x}:${y}`,
    "-c:a", "copy",
    output
  ], info.duration, options);
}

export async function rotateVideo(
  input: string,
  output: string,
  degrees: number,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  let filter = "";
  switch (degrees) {
    case 90: filter = "transpose=1"; break;
    case 180: filter = "transpose=2,transpose=2"; break;
    case 270: filter = "transpose=2"; break;
    default: filter = `rotate=${degrees}*PI/180`;
  }
  await runFFmpeg([
    "-i", input,
    "-vf", filter,
    "-c:a", "copy",
    output
  ], info.duration, options);
}

export async function addMusicToVideo(
  videoInput: string,
  audioInput: string,
  output: string,
  audioVolume: number = 1,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(videoInput);
  await runFFmpeg([
    "-i", videoInput,
    "-i", audioInput,
    "-filter_complex", `[1:a]volume=${audioVolume}[a];[0:a][a]amix=inputs=2:duration=first[out]`,
    "-map", "0:v",
    "-map", "[out]",
    "-c:v", "copy",
    output
  ], info.duration, options);
}

export async function loopVideo(
  input: string,
  output: string,
  times: number,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  await runFFmpeg([
    "-stream_loop", (times - 1).toString(),
    "-i", input,
    "-c", "copy",
    output
  ], info.duration * times, options);
}

export async function reverseVideo(
  input: string,
  output: string,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  await runFFmpeg([
    "-i", input,
    "-vf", "reverse",
    "-af", "areverse",
    output
  ], info.duration, options);
}

export async function muteVideo(
  input: string,
  output: string,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  await runFFmpeg([
    "-i", input,
    "-c:v", "copy",
    "-an",
    output
  ], info.duration, options);
}

// Format conversion
export async function convertFormat(
  input: string,
  output: string,
  outputFormat: string,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  const args = ["-i", input];

  // Add format-specific options
  switch (outputFormat) {
    case "mp3":
      args.push("-codec:a", "libmp3lame", "-qscale:a", "2");
      break;
    case "m4a":
      args.push("-codec:a", "aac", "-b:a", "192k");
      break;
    case "wav":
      args.push("-codec:a", "pcm_s16le");
      break;
    case "ogg":
      args.push("-codec:a", "libvorbis", "-qscale:a", "4");
      break;
    case "mp4":
      args.push("-codec:v", "libx264", "-preset", "medium", "-crf", "23");
      args.push("-codec:a", "aac", "-b:a", "128k");
      break;
    case "webm":
      args.push("-codec:v", "libvpx-vp9", "-crf", "30", "-b:v", "0");
      args.push("-codec:a", "libopus");
      break;
    case "avi":
      args.push("-codec:v", "mpeg4", "-b:v", "2000k");
      args.push("-codec:a", "mp3", "-b:a", "192k");
      break;
    case "mov":
      args.push("-codec:v", "libx264", "-codec:a", "aac");
      break;
    case "gif":
      args.push("-vf", "fps=10,scale=480:-1:flags=lanczos");
      break;
  }

  args.push(output);
  await runFFmpeg(args, info.duration, options);
}

export async function extractAudio(
  input: string,
  output: string,
  options?: FFmpegOptions
): Promise<void> {
  const info = await getMediaInfo(input);
  await runFFmpeg([
    "-i", input,
    "-vn",
    "-acodec", "libmp3lame",
    "-q:a", "2",
    output
  ], info.duration, options);
}
