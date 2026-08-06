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
 * Detect image MIME from magic bytes (first 12 bytes sufficient for our set).
 */
export function detectImageMimeFromMagic(
  bytes: Uint8Array,
): AllowedImageMime | null {
  if (bytes.length < 3) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: GIF87a / GIF89a
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Validate MIME + extension + size. Returns normalized content type and ext.
 * Pass `magicBytes` (first ≥12 bytes) to enforce magic-byte match.
 */
export function validateImageFile(file: {
  name: string;
  type: string;
  size: number;
  magicBytes?: Uint8Array;
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

  if (declared && !isAllowedMime(declared) && declared !== "image/jpg") {
    throw new StorageError(
      "INVALID_FILE",
      "Недопустимый тип файла (MIME)",
      400,
    );
  }

  if (declared && mimeFromExt && declared !== mimeFromExt) {
    const normalized =
      declared === "image/jpg" && mimeFromExt === "image/jpeg";
    if (!normalized) {
      throw new StorageError(
        "INVALID_FILE",
        "Расширение и тип файла не совпадают",
        400,
      );
    }
  }

  let contentType: AllowedImageMime =
    declared === "image/jpg"
      ? "image/jpeg"
      : declared && isAllowedMime(declared)
        ? declared
        : mimeFromExt ?? "image/jpeg";

  if (file.magicBytes && file.magicBytes.length > 0) {
    const magicMime = detectImageMimeFromMagic(file.magicBytes);
    if (!magicMime) {
      throw new StorageError(
        "INVALID_FILE",
        "Содержимое файла не является допустимым изображением",
        400,
      );
    }
    if (magicMime !== contentType && !(magicMime === "image/jpeg" && contentType === "image/jpeg")) {
      // Prefer magic bytes as source of truth when declared type mismatches.
      if (mimeFromExt && magicMime !== mimeFromExt) {
        throw new StorageError(
          "INVALID_FILE",
          "Содержимое файла не соответствует расширению",
          400,
        );
      }
      contentType = magicMime;
    }
  }

  return {
    contentType,
    extension: EXT_BY_MIME[contentType],
  };
}

/** Pathname: products/{sellerId}/{uuid}{ext} — embeds ownership. */
export function buildProductImagePathname(
  extension: string,
  sellerId: string,
): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  const safeSeller = sellerId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `products/${safeSeller}/${id}${ext}`;
}

export function buildAvatarImagePathname(
  extension: string,
  userId: string,
): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `avatars/${safeUser}/${id}${ext}`;
}

/** Extract storage pathname from a public blob URL. */
export function pathnameFromBlobUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const cleaned = pathname.replace(/^\//, "");
    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}

/** True if pathname is under products/{sellerId}/. */
export function isProductPathOwnedBySeller(
  pathname: string,
  sellerId: string,
): boolean {
  const safeSeller = sellerId.replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    pathname === `products/${safeSeller}` ||
    pathname.startsWith(`products/${safeSeller}/`)
  );
}

/** True if pathname is under avatars/{userId}/. */
export function isAvatarPathOwnedByUser(
  pathname: string,
  userId: string,
): boolean {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    pathname === `avatars/${safeUser}` ||
    pathname.startsWith(`avatars/${safeUser}/`)
  );
}
