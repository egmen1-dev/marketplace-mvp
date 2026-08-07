import { createVercelBlobStorage } from "./vercel-blob";
import type { StorageProvider } from "./types";

export {
  PRODUCT_IMAGE_LIMITS,
  PRODUCT_IMAGE_TOO_LARGE_MESSAGE,
  UPLOAD_UNAVAILABLE_MESSAGE,
  StorageError,
  type AllowedImageMime,
  type StorageProvider,
  type UploadInput,
  type UploadResult,
} from "./types";

export {
  buildProductImagePathname,
  buildAvatarImagePathname,
  validateImageFile,
  detectImageMimeFromMagic,
  pathnameFromBlobUrl,
  isProductPathOwnedBySeller,
  isAvatarPathOwnedByUser,
} from "./validate";

let cached: StorageProvider | null = null;

/**
 * Default storage provider (Vercel Blob).
 * Swap implementation here if migrating to R2 later.
 */
export function getStorage(): StorageProvider {
  if (!cached) {
    cached = createVercelBlobStorage();
  }
  return cached;
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}
