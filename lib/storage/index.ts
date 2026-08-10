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

export { createVercelBlobStorage } from "./vercel-blob";

/** Supported providers. Add `s3` / `r2` / `supabase` when implementations land. */
export type StorageProviderId = "vercel-blob";

let cached: StorageProvider | null = null;

function resolveProviderId(): StorageProviderId {
  const raw = (process.env.STORAGE_PROVIDER ?? "vercel-blob")
    .trim()
    .toLowerCase();
  if (raw === "vercel-blob" || raw === "blob" || raw === "") {
    return "vercel-blob";
  }
  // Fail closed: unknown provider → keep current Blob implementation so
  // misconfigured backup hosts do not silently break uploads mid-migration.
  console.warn(
    `[storage] Unknown STORAGE_PROVIDER="${raw}", using vercel-blob`,
  );
  return "vercel-blob";
}

/**
 * Default storage provider.
 * Today: Vercel Blob. Future: switch on STORAGE_PROVIDER (s3 / r2 / …).
 */
export function getStorage(): StorageProvider {
  if (!cached) {
    switch (resolveProviderId()) {
      case "vercel-blob":
      default:
        cached = createVercelBlobStorage();
        break;
    }
  }
  return cached;
}

/** True when the active provider has credentials for uploads. */
export function isBlobConfigured(): boolean {
  switch (resolveProviderId()) {
    case "vercel-blob":
    default:
      return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
  }
}

/** Reset cached provider (tests only). */
export function __resetStorageCacheForTests(): void {
  cached = null;
}
