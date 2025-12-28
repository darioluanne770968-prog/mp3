export type TaskStatus = "pending" | "processing" | "completed" | "failed";

export type ToolCategory = "audio" | "video" | "pdf" | "converter";

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  category: ToolCategory;
}

export interface AudioFile {
  id: string;
  name: string;
  size: number;
  duration: number;
  format: string;
  url: string;
}

export interface VideoFile {
  id: string;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  format: string;
  url: string;
}

export interface ProcessingTask {
  id: string;
  type: string;
  status: TaskStatus;
  progress: number;
  inputFile: string;
  outputFile?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface AudioSettings {
  volume: number;
  speed: number;
  pitch: number;
  bass: number;
  mid: number;
  treble: number;
  fadeIn: number;
  fadeOut: number;
}

export interface VideoSettings {
  volume: number;
  speed: number;
  rotation: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}
