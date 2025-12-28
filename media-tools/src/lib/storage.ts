import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveFile(
  file: Buffer,
  originalName: string
): Promise<{ path: string; id: string }> {
  await ensureUploadDir();

  const ext = path.extname(originalName);
  const id = uuidv4();
  const fileName = `${id}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  await fs.writeFile(filePath, file);

  return { path: filePath, id };
}

export async function getFilePath(fileId: string, ext: string): Promise<string> {
  return path.join(UPLOAD_DIR, `${fileId}${ext}`);
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File may not exist
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getUploadDir(): string {
  return UPLOAD_DIR;
}

export async function cleanupExpiredFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
  await ensureUploadDir();
  const files = await fs.readdir(UPLOAD_DIR);
  const now = Date.now();

  for (const file of files) {
    const filePath = path.join(UPLOAD_DIR, file);
    const stats = await fs.stat(filePath);
    if (now - stats.mtimeMs > maxAge) {
      await deleteFile(filePath);
    }
  }
}
