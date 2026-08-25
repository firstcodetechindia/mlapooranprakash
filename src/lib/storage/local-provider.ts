import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { StorageProvider } from "./types";

const ROOT = join(process.cwd(), ".data", "uploads");

/**
 * Dev/local fallback used when STORAGE_* env vars aren't set. Files live
 * outside /public — they're only ever read back through an authenticated
 * route handler that checks organization membership first, never served
 * directly by Next.js's static file handling.
 */
export class LocalDiskStorageProvider implements StorageProvider {
  readonly name = "local-disk";

  private resolve(key: string): string {
    // Keys are always generated server-side (see uploadKnowledgeDocument),
    // never taken verbatim from user input, so this isn't a traversal risk
    // — but strip any path separators defensively anyway.
    const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return join(ROOT, safeKey);
  }

  async upload({ key, buffer }: { key: string; buffer: Buffer; contentType: string }) {
    const path = this.resolve(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
