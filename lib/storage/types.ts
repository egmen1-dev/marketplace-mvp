/** Thin storage abstraction — Vercel Blob today, R2-swappable later. */

export const PRODUCT_IMAGE_LIMITS = {
  maxCount: 10,
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ] as const,
  extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const,
} as const;

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
  upload(input: UploadInput): Promise<UploadResult>;
  deleteByUrl(url: string): Promise<void>;
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
