/**
 * Storage Service
 * Handles file storage operations (S3 or local fallback)
 */

import { ENV } from "./_core/env";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

interface StorageResult {
  url: string;
  key: string;
}

// Local storage fallback directory
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || "./uploads";

/**
 * Upload a file to storage
 */
export async function storagePut(
  key: string,
  data: Buffer,
  contentType: string
): Promise<StorageResult> {
  // If S3 is configured, use S3
  if (ENV.s3BucketName && ENV.s3AccessKeyId && ENV.s3SecretAccessKey) {
    try {
      return await uploadToS3(key, data, contentType);
    } catch (error) {
      console.warn("[Storage] S3 upload failed, falling back to local storage:", error);
    }
  }

  // Use local file storage
  return await uploadToLocal(key, data);
}

/**
 * Get a file from storage
 */
export async function storageGet(key: string): Promise<Buffer | null> {
  if (ENV.s3BucketName && ENV.s3AccessKeyId && ENV.s3SecretAccessKey) {
    try {
      return await getFromS3(key);
    } catch (error) {
      console.warn("[Storage] S3 get failed, trying local storage:", error);
    }
  }
  return await getFromLocal(key);
}

/**
 * Delete a file from storage
 */
export async function storageDelete(key: string): Promise<void> {
  if (ENV.s3BucketName && ENV.s3AccessKeyId && ENV.s3SecretAccessKey) {
    try {
      return await deleteFromS3(key);
    } catch (error) {
      console.warn("[Storage] S3 delete failed:", error);
    }
  }
  return await deleteFromLocal(key);
}

/**
 * Generate a signed URL for temporary access
 */
export async function storageGetSignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (ENV.s3BucketName && ENV.s3AccessKeyId && ENV.s3SecretAccessKey) {
    try {
      return await getS3SignedUrl(key, expiresIn);
    } catch (error) {
      console.warn("[Storage] S3 signed URL failed:", error);
    }
  }
  // For local storage, just return the direct path
  return `/api/files/${key}`;
}

// ============ S3 Implementation ============
// Note: These functions require @aws-sdk/client-s3 to be installed

async function uploadToS3(
  key: string,
  data: Buffer,
  contentType: string
): Promise<StorageResult> {
  // Dynamic import to handle missing dependency gracefully
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3" as string);

  const client = new S3Client({
    region: ENV.s3Region,
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  );

  const url = `https://${ENV.s3BucketName}.s3.${ENV.s3Region}.amazonaws.com/${key}`;
  return { url, key };
}

async function getFromS3(key: string): Promise<Buffer | null> {
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3" as string);

  const client = new S3Client({
    region: ENV.s3Region,
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  });

  const response = await client.send(
    new GetObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: key,
    })
  );

  if (response.Body) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  return null;
}

async function deleteFromS3(key: string): Promise<void> {
  const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3" as string);

  const client = new S3Client({
    region: ENV.s3Region,
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  });

  await client.send(
    new DeleteObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: key,
    })
  );
}

async function getS3SignedUrl(key: string, expiresIn: number): Promise<string> {
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3" as string);
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner" as string);

  const client = new S3Client({
    region: ENV.s3Region,
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  });

  const command = new GetObjectCommand({
    Bucket: ENV.s3BucketName,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

// ============ Local Storage Implementation ============

async function uploadToLocal(key: string, data: Buffer): Promise<StorageResult> {
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  const dir = path.dirname(filePath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Write file
  await fs.writeFile(filePath, data);

  const url = `/api/files/${key}`;
  return { url, key };
}

async function getFromLocal(key: string): Promise<Buffer | null> {
  const filePath = path.join(LOCAL_STORAGE_DIR, key);

  try {
    return await fs.readFile(filePath);
  } catch (error) {
    console.error("[Storage] Failed to read local file:", error);
    return null;
  }
}

async function deleteFromLocal(key: string): Promise<void> {
  const filePath = path.join(LOCAL_STORAGE_DIR, key);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error("[Storage] Failed to delete local file:", error);
  }
}

/**
 * Generate a unique file key
 */
export function generateFileKey(prefix: string, filename: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
  return `${prefix}/${timestamp}-${random}-${baseName}${ext}`;
}
