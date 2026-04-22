import { Queue, Worker, Job, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export type JobType =
  | "audio-trim"
  | "audio-merge"
  | "audio-volume"
  | "audio-speed"
  | "audio-pitch"
  | "audio-equalizer"
  | "audio-reverse"
  | "audio-vocal-remove"
  | "audio-ringtone"
  | "audio-convert"
  | "video-trim"
  | "video-crop"
  | "video-rotate"
  | "video-speed"
  | "video-volume"
  | "video-mute"
  | "video-add-music"
  | "video-loop"
  | "video-reverse"
  | "video-convert"
  | "video-add-text"
  | "video-filters"
  | "pdf-to-word"
  | "pdf-to-excel"
  | "pdf-to-jpg"
  | "word-to-pdf"
  | "pdf-merge"
  | "pdf-split"
  | "pdf-compress"
  | "pdf-protect"
  | "pdf-unlock"
  | "pdf-rotate"
  | "image-convert"
  | "document-convert"
  | "compress-archive"
  | "archive-extract";

export interface JobData {
  taskId: string;
  type: JobType;
  inputFile: string;
  outputFile: string;
  params: Record<string, unknown>;
}

export interface JobResult {
  success: boolean;
  outputFile?: string;
  error?: string;
}

export const mediaQueue = new Queue<JobData, JobResult>("media-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

export const queueEvents = new QueueEvents("media-processing", { connection });

export async function addJob(data: JobData): Promise<Job<JobData, JobResult>> {
  return mediaQueue.add(data.type, data, {
    jobId: data.taskId,
  });
}

export async function getJobProgress(taskId: string): Promise<{
  status: string;
  progress: number;
  result?: JobResult;
}> {
  const job = await mediaQueue.getJob(taskId);
  if (!job) {
    return { status: "not_found", progress: 0 };
  }

  const state = await job.getState();
  const progress = typeof job.progress === "number" ? job.progress : 0;

  return {
    status: state,
    progress,
    result: job.returnvalue ?? undefined,
  };
}

export { connection };
