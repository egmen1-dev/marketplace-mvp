"use client";

import { upload } from "@vercel/blob/client";

import {
  PRODUCT_IMAGE_LIMITS,
  PRODUCT_IMAGE_TOO_LARGE_MESSAGE,
  UPLOAD_UNAVAILABLE_MESSAGE,
} from "@/lib/storage/types";

export type ClientUploadPurpose = "product" | "avatar";

export type ClientUploadResult = {
  url: string;
  pathname: string;
};

type WindowWithUploadMock = Window & {
  __lotUploadImage?: (
    file: File,
    options: { pathPrefix: string; purpose: ClientUploadPurpose },
  ) => Promise<ClientUploadResult>;
};

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function extensionForFile(file: File): string | null {
  const fromName = /\.[a-zA-Z0-9]+$/.exec(file.name)?.[0]?.toLowerCase();
  if (
    fromName &&
    (PRODUCT_IMAGE_LIMITS.extensions as readonly string[]).includes(fromName)
  ) {
    return fromName === ".jpeg" ? ".jpg" : fromName;
  }
  const byMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return byMime[file.type.toLowerCase()] ?? null;
}

function resolveContentType(file: File, ext: string): string {
  const allowed = PRODUCT_IMAGE_LIMITS.mimeTypes as readonly string[];
  const declared = (file.type || "").toLowerCase();
  if (declared === "image/jpg") return "image/jpeg";
  if (declared && allowed.includes(declared)) return declared;
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

function mapBlobUploadError(err: unknown): Error {
  const message = err instanceof Error ? err.message : "";

  if (/413|entity too large|too large|maximum size|max size/i.test(message)) {
    return new Error(PRODUCT_IMAGE_TOO_LARGE_MESSAGE);
  }
  if (/not configured|503/i.test(message)) {
    return new Error(UPLOAD_UNAVAILABLE_MESSAGE);
  }
  if (/content.?type|not allowed|mime|invalid type/i.test(message)) {
    return new Error(
      "Недопустимый тип файла. Используйте JPEG, PNG, WebP или GIF.",
    );
  }
  if (/failed to\s+retrieve the client token|некорректный путь|требуется вход|продавца/i.test(
    message,
  )) {
    return new Error(
      "Не удалось начать загрузку. Обновите страницу и попробуйте снова.",
    );
  }
  if (
    message &&
    !/BLOB_|stack|at\s+\S+\s+\(|process\.env|ECONNREFUSED|ENOTFOUND/i.test(
      message,
    )
  ) {
    // Strip noisy SDK prefix when present
    const cleaned = message.replace(/^Vercel Blob:\s*/i, "").trim();
    if (cleaned) return new Error(cleaned);
  }
  return new Error("Не удалось загрузить изображение");
}

/**
 * Direct-to-Blob upload (bypasses Vercel serverless ~4.5MB body limit / 413).
 * Server only issues a short-lived client token via POST /api/uploads (JSON).
 *
 * Note: do NOT force multipart for typical product photos (≤20MB). Client PUT
 * goes straight to Blob CDN; multipart has caused mid-size (5–10MB) failures.
 */
export async function uploadImageFromClient(
  file: File,
  options: { pathPrefix: string; purpose: ClientUploadPurpose },
): Promise<ClientUploadResult> {
  const mock = (window as WindowWithUploadMock).__lotUploadImage;
  if (mock) {
    return mock(file, options);
  }

  if (!options.pathPrefix) {
    throw new Error(UPLOAD_UNAVAILABLE_MESSAGE);
  }
  if (file.size > PRODUCT_IMAGE_LIMITS.maxBytes) {
    throw new Error(PRODUCT_IMAGE_TOO_LARGE_MESSAGE);
  }

  const ext = extensionForFile(file);
  if (!ext) {
    throw new Error(`«${file.name}»: только JPEG, PNG, WebP, GIF`);
  }

  const contentType = resolveContentType(file, ext);
  const pathname = `${options.pathPrefix}${crypto.randomUUID()}${ext}`;
  const handleUploadUrl = `${window.location.origin}/api/uploads`;

  try {
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl,
      contentType,
      clientPayload: JSON.stringify({ purpose: options.purpose }),
    });
    return { url: blob.url, pathname: blob.pathname };
  } catch (err) {
    throw mapBlobUploadError(err);
  }
}
