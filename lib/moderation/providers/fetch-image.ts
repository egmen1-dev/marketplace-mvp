import { createHash } from "node:crypto";

import { isPrivateVercelBlobUrl } from "@/lib/storage";

const FETCH_TIMEOUT_MS = Number(process.env.MODERATION_IMAGE_FETCH_TIMEOUT_MS ?? "15000");
const MAX_BYTES = Number(process.env.MODERATION_IMAGE_MAX_BYTES ?? String(12 * 1024 * 1024));

export type FetchedImage = {
  bytes: Buffer;
  mimeType: string;
  contentHash: string;
};

export function hashImageBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function fetchImageBytes(url: string): Promise<FetchedImage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {};
    if (isPrivateVercelBlobUrl(url) && process.env.BLOB_READ_WRITE_TOKEN) {
      headers.Authorization = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
    }

    const res = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    if (bytes.length > MAX_BYTES) {
      throw new Error("IMAGE_TOO_LARGE");
    }
    const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    return { bytes, mimeType, contentHash: hashImageBytes(bytes) };
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch local fixture path (tests) or file:// for generated fixtures. */
export async function fetchImageBytesFromPath(path: string): Promise<FetchedImage> {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const full = path.startsWith("/") ? path : join(process.cwd(), path);
  const bytes = readFileSync(full);
  const ext = full.split(".").pop()?.toLowerCase();
  const mimeType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
  return { bytes, mimeType, contentHash: hashImageBytes(bytes) };
}
