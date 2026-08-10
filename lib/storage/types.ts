/**
 * Thin storage abstraction.
 * Current: Vercel Blob (`VercelBlobProvider`).
 * Planned: S3-compatible / Cloudflare R2 / Supabase Storage — implement
 * `StorageProvider` and select via `STORAGE_PROVIDER` in `lib/storage/index.ts`.
 * Do not wire upload UI to a vendor SDK outside this module.
 */

export const PRODUCT_IMAGE_LIMITS = {
  maxCount: 10,
  maxBytes: 20 * 1024 * 1024,
  mimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ] as const,
  extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const,
} as const;

/** User-facing message when an image exceeds PRODUCT_IMAGE_LIMITS.maxBytes */
export const PRODUCT_IMAGE_TOO_LARGE_MESSAGE =
  "Максимальный размер изображения — 20 МБ";

/** User-facing message when Blob storage is not configured */
export const UPLOAD_UNAVAILABLE_MESSAGE =
  "Загрузка изображений временно недоступна";

export type AllowedImageMime =
  (typeof PRODUCT_IMAGE_LIMITS.mimeTypes)[number];

export type UploadInput = {
  /** Binary body */
  data: Blob | ArrayBuffer | Buffer;
  /** Relative path under the bucket, e.g. `products/<uuid>.jpg` */
  pathname: string;
  contentType: AllowedImageMime;
  /** Original filename for Content-Disposition / logging */
  filename?: string;
};

export type UploadResult = {
  url: string;
  pathname: string;
};

export type StorageProvider = {
  /** Upload bytes; returns a public absolute URL. */
  upload(input: UploadInput): Promise<UploadResult>;
  /**
   * Delete object by public URL (or pathname if the provider accepts it).
   * Prefer this over vendor SDKs in feature code.
   */
  delete(url: string): Promise<void>;
  /** @deprecated Prefer `delete` — kept for existing call sites. */
  deleteByUrl(url: string): Promise<void>;
  /**
   * Resolve a public URL for a stored pathname.
   * Returns `null` when the provider only knows absolute URLs after upload
   * (e.g. Vercel Blob store host is not derivable from pathname alone).
   */
  getUrl(pathname: string): string | null;
  /** True if this URL was stored by our provider (safe to delete). */
  isOwnedUrl(url: string): boolean;
};

export class StorageError extends Error {
  constructor(
    public readonly code:
      | "NOT_CONFIGURED"
      | "INVALID_FILE"
      | "TOO_LARGE"
      | "UPLOAD_FAILED"
      | "DELETE_FAILED",
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "StorageError";
  }
}
