import archiver from "archiver";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { createReadStream, createWriteStream } from "fs";
import { spawn } from "child_process";

export interface ArchiveOptions {
  onProgress?: (progress: number) => void;
}

// Create ZIP archive from files
export async function createZip(
  inputFiles: string[],
  outputFile: string,
  options?: ArchiveOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputFile);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      if (options?.onProgress) {
        options.onProgress(100);
      }
      resolve();
    });

    archive.on("error", reject);

    archive.on("progress", (progress) => {
      if (options?.onProgress && progress.entries.total > 0) {
        const percent = Math.round((progress.entries.processed / progress.entries.total) * 100);
        options.onProgress(percent);
      }
    });

    archive.pipe(output);

    for (const file of inputFiles) {
      const name = path.basename(file);
      archive.file(file, { name });
    }

    archive.finalize();
  });
}

// Create ZIP from directory
export async function createZipFromDir(
  inputDir: string,
  outputFile: string,
  options?: ArchiveOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputFile);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      if (options?.onProgress) {
        options.onProgress(100);
      }
      resolve();
    });

    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(inputDir, false);
    archive.finalize();
  });
}

// Extract ZIP archive
export async function extractZip(
  inputFile: string,
  outputDir: string,
  options?: ArchiveOptions
): Promise<string[]> {
  const unzipper = await import("unzipper");

  return new Promise((resolve, reject) => {
    const extractedFiles: string[] = [];

    createReadStream(inputFile)
      .pipe(unzipper.Parse())
      .on("entry", async (entry) => {
        const filePath = path.join(outputDir, entry.path);
        const dir = path.dirname(filePath);

        await fsPromises.mkdir(dir, { recursive: true });

        if (entry.type === "File") {
          entry.pipe(createWriteStream(filePath));
          extractedFiles.push(filePath);
        } else {
          entry.autodrain();
        }
      })
      .on("close", () => {
        if (options?.onProgress) {
          options.onProgress(100);
        }
        resolve(extractedFiles);
      })
      .on("error", reject);
  });
}

// Extract RAR archive (requires unar command)
export async function extractRar(
  inputFile: string,
  outputDir: string,
  options?: ArchiveOptions
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const args = ["-o", outputDir, "-f", inputFile];

    const proc = spawn("unar", args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`unar failed: ${stderr}. Install: brew install unar`));
        return;
      }

      // List extracted files
      const files = await listFilesRecursive(outputDir);

      if (options?.onProgress) {
        options.onProgress(100);
      }

      resolve(files);
    });
  });
}

// Extract 7Z archive (requires 7z command)
export async function extract7z(
  inputFile: string,
  outputDir: string,
  options?: ArchiveOptions
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const args = ["x", `-o${outputDir}`, "-y", inputFile];

    const proc = spawn("7z", args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`7z failed: ${stderr}. Install: brew install p7zip`));
        return;
      }

      const files = await listFilesRecursive(outputDir);

      if (options?.onProgress) {
        options.onProgress(100);
      }

      resolve(files);
    });
  });
}

// Create 7Z archive
export async function create7z(
  inputFiles: string[],
  outputFile: string,
  compressionLevel: number = 9,
  options?: ArchiveOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ["a", `-mx=${compressionLevel}`, outputFile, ...inputFiles];

    const proc = spawn("7z", args);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`7z creation failed: ${stderr}`));
        return;
      }

      if (options?.onProgress) {
        options.onProgress(100);
      }

      resolve();
    });
  });
}

// Helper function to list files recursively
async function listFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// Detect archive type and extract
export async function extractArchive(
  inputFile: string,
  outputDir: string,
  options?: ArchiveOptions
): Promise<string[]> {
  const ext = path.extname(inputFile).toLowerCase();

  switch (ext) {
    case ".zip":
      return extractZip(inputFile, outputDir, options);
    case ".rar":
      return extractRar(inputFile, outputDir, options);
    case ".7z":
      return extract7z(inputFile, outputDir, options);
    default:
      throw new Error(`Unsupported archive format: ${ext}`);
  }
}
