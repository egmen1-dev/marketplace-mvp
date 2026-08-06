import {
  PRODUCT_IMAGE_LIMITS,
  StorageError,
  type AllowedImageMime,
} from "./types";

const MIME_BY_EXT: Record<string, AllowedImageMime> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const EXT_BY_MIME: Record<AllowedImageMime, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function extensionFromFilename(filename: string): string | null {
  const match = /\.[a-zA-Z0-9]+$/.exec(filename.trim());
  return match ? match[0].toLowerCase() : null;
}

export function isAllowedMime(mime: string): mime is AllowedImageMime {
  return (PRODUCT_IMAGE_LIMITS.mimeTypes as readonly string[]).includes(mime);
}

/**
 * Validate MIME + extension + size. Returns normalized content type and ext.
 */
export function validateImageFile(file: {
  name: string;
  type: string;
  size: number;
}): { contentType: AllowedImageMime; extension: string } {
  if (file.size <= 0) {
    throw new StorageError("INVALID_FILE", "Пустой файл", 400);
  }
  if (file.size > PRODUCT_IMAGE_LIMITS.maxBytes) {
    throw new StorageError(
      "TOO_LARGE",
      `Файл больше ${PRODUCT_IMAGE_LIMITS.maxBytes / (1024 * 1024)} МБ`,
      400,
    );
  }

  const ext = extensionFromFilename(file.name);
  if (
    !ext ||
    !(PRODUCT_IMAGE_LIMITS.extensions as readonly string[]).includes(ext)
  ) {
    throw new StorageError(
      "INVALID_FILE",
      "Допустимы JPEG, PNG, WebP и GIF",
      400,
    );
  }

  const mimeFromExt = MIME_BY_EXT[ext];
  const declared = file.type?.toLowerCase() || "";

  // Accept empty type from some browsers; otherwise require match.
  if (declared && !isAllowedMime(declared)) {
    throw new StorageError(
      "INVALID_FILE",
      "Недопустимый тип файла (MIME)",
      400,
    );
  }

  if (declared && mimeFromExt && declared !== mimeFromExt) {
    // image/jpg is non-standard but sometimes sent
    const normalized =
      declared === "image/jpg" && mimeFromExt === "image/jpeg"
        ? true
        : false;
    if (!normalized) {
      throw new StorageError(
        "INVALID_FILE",
        "Расширение и тип файла не совпадают",
        400,
      );
    }
  }

  const contentType: AllowedImageMime =
    declared && isAllowedMime(declared)
      ? declared
      : mimeFromExt ?? "image/jpeg";

  return {
    contentType,
    extension: EXT_BY_MIME[contentType],
  };
}

export function buildProductImagePathname(extension: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return `products/${id}${ext}`;
}

export function buildAvatarImagePathname(extension: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return `avatars/${id}${ext}`;
}
