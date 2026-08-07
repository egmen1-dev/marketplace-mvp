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

/**
 * Direct-to-Blob upload (bypasses Vercel serverless 4.5MB body limit / 413).
 * Server only issues a short-lived client token via POST /api/uploads (JSON).
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

  const pathname = `${options.pathPrefix}${crypto.randomUUID()}${ext}`;

  try {
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/uploads",
      // Multipart avoids edge body limits for mid-size photos.
      multipart: true,
      contentType: file.type || undefined,
      clientPayload: JSON.stringify({ purpose: options.purpose }),
    });
    return { url: blob.url, pathname: blob.pathname };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/413|too large|entity too large/i.test(message)) {
      throw new Error(PRODUCT_IMAGE_TOO_LARGE_MESSAGE);
    }
    if (/not configured|unauthorized|503|token/i.test(message)) {
      throw new Error(UPLOAD_UNAVAILABLE_MESSAGE);
    }
    if (message && !/BLOB_|stack|process\.env/i.test(message)) {
      throw new Error(message);
    }
    throw new Error("Не удалось загрузить изображение");
  }
}
