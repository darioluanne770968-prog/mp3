import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

export type StorageProvider = "local" | "s3" | "oss" | "gcs";

interface StorageConfig {
  provider: StorageProvider;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  localPath?: string;
}

const config: StorageConfig = {
  provider: (process.env.STORAGE_PROVIDER as StorageProvider) || "local",
  bucket: process.env.STORAGE_BUCKET,
  region: process.env.STORAGE_REGION || "us-east-1",
  endpoint: process.env.STORAGE_ENDPOINT,
  accessKeyId: process.env.STORAGE_ACCESS_KEY,
  secretAccessKey: process.env.STORAGE_SECRET_KEY,
  localPath: process.env.UPLOAD_DIR || "./uploads",
};

// S3 client (compatible with S3, OSS, MinIO, etc.)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId || "",
        secretAccessKey: config.secretAccessKey || "",
      },
      forcePathStyle: !!config.endpoint, // Required for MinIO and custom endpoints
    });
  }
  return s3Client;
}

export async function uploadFile(
  filePath: string,
  key: string,
  contentType?: string
): Promise<string> {
  if (config.provider === "local") {
    const destPath = path.join(config.localPath!, key);
    const destDir = path.dirname(destPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(filePath, destPath);
    return destPath;
  }

  // S3-compatible upload
  const client = getS3Client();
  const fileContent = fs.readFileSync(filePath);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    })
  );

  return `${config.endpoint || `https://${config.bucket}.s3.${config.region}.amazonaws.com`}/${key}`;
}

export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType?: string
): Promise<string> {
  if (config.provider === "local") {
    const destPath = path.join(config.localPath!, key);
    const destDir = path.dirname(destPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.writeFileSync(destPath, buffer);
    return destPath;
  }

  // S3-compatible upload
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${config.endpoint || `https://${config.bucket}.s3.${config.region}.amazonaws.com`}/${key}`;
}

export async function downloadFile(key: string): Promise<Buffer> {
  if (config.provider === "local") {
    const filePath = path.join(config.localPath!, key);
    return fs.readFileSync(filePath);
  }

  // S3-compatible download
  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );

  const chunks: Buffer[] = [];
  const stream = response.Body as NodeJS.ReadableStream;

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function deleteFile(key: string): Promise<void> {
  if (config.provider === "local") {
    const filePath = path.join(config.localPath!, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return;
  }

  // S3-compatible delete
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  if (config.provider === "local") {
    // For local storage, return an API endpoint
    return `/api/upload/presigned?key=${encodeURIComponent(key)}`;
  }

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (config.provider === "local") {
    // For local storage, return an API endpoint
    return `/api/download/file?key=${encodeURIComponent(key)}`;
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export function getStorageProvider(): StorageProvider {
  return config.provider;
}

export function getPublicUrl(key: string): string {
  if (config.provider === "local") {
    return `/files/${key}`;
  }

  return `${config.endpoint || `https://${config.bucket}.s3.${config.region}.amazonaws.com`}/${key}`;
}
