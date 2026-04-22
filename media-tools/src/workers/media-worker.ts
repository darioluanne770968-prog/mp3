import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import * as ffmpeg from "../lib/ffmpeg";
import * as pdf from "../lib/pdf";
import * as archive from "../lib/archive";
import { JobData, JobResult } from "../lib/queue";
import prisma from "../lib/prisma";
import path from "path";
import fs from "fs/promises";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

async function updateTaskProgress(taskId: string, progress: number) {
  await prisma.task.update({
    where: { id: taskId },
    data: { progress },
  });
}

async function processJob(job: Job<JobData, JobResult>): Promise<JobResult> {
  const { taskId, type, inputFile, outputFile, params } = job.data;

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "PROCESSING" },
    });

    const onProgress = async (progress: number) => {
      await job.updateProgress(progress);
      await updateTaskProgress(taskId, progress);
    };

    switch (type) {
      case "audio-trim":
        await ffmpeg.trimAudio(
          inputFile,
          outputFile,
          params.start as number,
          params.end as number,
          { onProgress }
        );
        break;

      case "audio-merge":
        await ffmpeg.mergeAudio(
          params.files as string[],
          outputFile,
          { onProgress }
        );
        break;

      case "audio-volume":
        await ffmpeg.adjustVolume(
          inputFile,
          outputFile,
          params.volume as number,
          { onProgress }
        );
        break;

      case "audio-speed":
        await ffmpeg.changeSpeed(
          inputFile,
          outputFile,
          params.speed as number,
          false,
          { onProgress }
        );
        break;

      case "audio-pitch":
        await ffmpeg.changePitch(
          inputFile,
          outputFile,
          params.semitones as number,
          { onProgress }
        );
        break;

      case "audio-equalizer":
        await ffmpeg.applyEqualizer(
          inputFile,
          outputFile,
          params.bass as number,
          params.mid as number,
          params.treble as number,
          { onProgress }
        );
        break;

      case "audio-reverse":
        await ffmpeg.reverseAudio(inputFile, outputFile, { onProgress });
        break;

      case "audio-ringtone":
        await ffmpeg.createRingtone(
          inputFile,
          outputFile,
          params.start as number,
          params.duration as number,
          params.fadeIn as number,
          params.fadeOut as number,
          { onProgress }
        );
        break;

      case "audio-convert":
        await ffmpeg.convertFormat(
          inputFile,
          outputFile,
          params.format as string,
          { onProgress }
        );
        break;

      case "video-trim":
        await ffmpeg.trimVideo(
          inputFile,
          outputFile,
          params.start as number,
          params.end as number,
          { onProgress }
        );
        break;

      case "video-crop":
        await ffmpeg.cropVideo(
          inputFile,
          outputFile,
          params.x as number,
          params.y as number,
          params.width as number,
          params.height as number,
          { onProgress }
        );
        break;

      case "video-rotate":
        await ffmpeg.rotateVideo(
          inputFile,
          outputFile,
          params.degrees as number,
          { onProgress }
        );
        break;

      case "video-speed":
        await ffmpeg.changeSpeed(
          inputFile,
          outputFile,
          params.speed as number,
          true,
          { onProgress }
        );
        break;

      case "video-volume":
        await ffmpeg.adjustVolume(
          inputFile,
          outputFile,
          params.volume as number,
          { onProgress }
        );
        break;

      case "video-mute":
        await ffmpeg.muteVideo(inputFile, outputFile, { onProgress });
        break;

      case "video-add-music":
        await ffmpeg.addMusicToVideo(
          inputFile,
          params.audioFile as string,
          outputFile,
          params.audioVolume as number,
          { onProgress }
        );
        break;

      case "video-loop":
        await ffmpeg.loopVideo(
          inputFile,
          outputFile,
          params.times as number,
          { onProgress }
        );
        break;

      case "video-reverse":
        await ffmpeg.reverseVideo(inputFile, outputFile, { onProgress });
        break;

      case "video-convert":
        await ffmpeg.convertFormat(
          inputFile,
          outputFile,
          params.format as string,
          { onProgress }
        );
        break;

      case "video-add-text":
        await ffmpeg.addTextToVideo(
          inputFile,
          outputFile,
          params.text as string,
          params.position as "top" | "center" | "bottom",
          params.fontSize as number,
          params.fontColor as string,
          params.backgroundColor as string,
          { onProgress }
        );
        break;

      case "video-filters":
        await ffmpeg.applyVideoFilters(
          inputFile,
          outputFile,
          params.brightness as number,
          params.contrast as number,
          params.saturation as number,
          { onProgress }
        );
        break;

      case "audio-vocal-remove":
        await ffmpeg.removeVocals(inputFile, outputFile, { onProgress });
        break;

      case "image-convert":
        await ffmpeg.convertImage(
          inputFile,
          outputFile,
          params.quality as number,
          params.width as number | undefined,
          params.height as number | undefined,
          { onProgress }
        );
        break;

      // PDF operations
      case "pdf-merge":
        await pdf.mergePDFs(
          params.files as string[],
          outputFile,
          { onProgress }
        );
        break;

      case "pdf-split": {
        const outputDir = path.dirname(outputFile);
        await pdf.splitPDF(
          inputFile,
          outputDir,
          params.ranges as { start: number; end: number }[] | undefined,
          { onProgress }
        );
        break;
      }

      case "pdf-rotate":
        await pdf.rotatePDF(
          inputFile,
          outputFile,
          params.rotation as 90 | 180 | 270,
          params.pages as number[] | undefined,
          { onProgress }
        );
        break;

      case "pdf-compress":
        await pdf.compressPDF(inputFile, outputFile, { onProgress });
        break;

      case "pdf-protect":
        await pdf.protectPDF(
          inputFile,
          outputFile,
          params.password as string,
          params.ownerPassword as string | undefined,
          { onProgress }
        );
        break;

      case "pdf-to-jpg": {
        const imgOutputDir = path.dirname(outputFile);
        await pdf.pdfToImages(
          inputFile,
          imgOutputDir,
          "jpg",
          params.dpi as number || 150,
          { onProgress }
        );
        break;
      }

      case "pdf-to-word": {
        const wordOutputDir = path.dirname(outputFile);
        await pdf.pdfToWord(inputFile, wordOutputDir, { onProgress });
        break;
      }

      case "pdf-to-excel": {
        const excelOutputDir = path.dirname(outputFile);
        await pdf.pdfToExcel(inputFile, excelOutputDir, { onProgress });
        break;
      }

      case "word-to-pdf": {
        const pdfOutputDir = path.dirname(outputFile);
        await pdf.documentToPDF(inputFile, pdfOutputDir, { onProgress });
        break;
      }

      // Archive operations
      case "compress-archive":
        if (params.format === "7z") {
          await archive.create7z(
            params.files as string[],
            outputFile,
            params.level as number || 9,
            { onProgress }
          );
        } else {
          await archive.createZip(
            params.files as string[],
            outputFile,
            { onProgress }
          );
        }
        break;

      case "archive-extract": {
        const extractDir = path.dirname(outputFile);
        await archive.extractArchive(inputFile, extractDir, { onProgress });
        break;
      }

      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        progress: 100,
        outputFile,
        completedAt: new Date(),
      },
    });

    return { success: true, outputFile };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        error: errorMessage,
      },
    });

    return { success: false, error: errorMessage };
  }
}

const worker = new Worker<JobData, JobResult>("media-processing", processJob, {
  connection,
  concurrency: 2,
});

worker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

console.log("Media worker started");

export default worker;
