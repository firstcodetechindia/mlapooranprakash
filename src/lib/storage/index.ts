import "server-only";

import type { StorageProvider } from "./types";
import { LocalDiskStorageProvider } from "./local-provider";
import { S3StorageProvider } from "./s3-provider";

export type { StorageProvider };

let cached: StorageProvider | null = null;

export function isS3Configured(): boolean {
  return Boolean(
    process.env.STORAGE_ENDPOINT &&
      process.env.STORAGE_BUCKET &&
      process.env.STORAGE_ACCESS_KEY &&
      process.env.STORAGE_SECRET_KEY,
  );
}

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;

  if (isS3Configured()) {
    cached = new S3StorageProvider({
      endpoint: process.env.STORAGE_ENDPOINT!,
      bucket: process.env.STORAGE_BUCKET!,
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
      region: process.env.STORAGE_REGION ?? "auto",
    });
  } else {
    cached = new LocalDiskStorageProvider();
  }

  return cached;
}
