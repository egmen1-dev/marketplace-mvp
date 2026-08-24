import type { ImagePickerAsset } from "expo-image-picker";

export type NormalizedImageAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  fileSize?: number;
};

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function extensionFromFileName(fileName: string): string | null {
  const match = /\.[a-zA-Z0-9]+$/.exec(fileName.trim());
  return match ? match[0].toLowerCase() : null;
}

export function inferMimeType(asset: Pick<ImagePickerAsset, "mimeType" | "uri" | "fileName">): string {
  const declared = asset.mimeType?.toLowerCase().trim();
  if (declared && declared !== "application/octet-stream") {
    return declared === "image/jpg" ? "image/jpeg" : declared;
  }

  const fromName = asset.fileName ? extensionFromFileName(asset.fileName) : null;
  if (fromName && MIME_BY_EXT[fromName]) return MIME_BY_EXT[fromName];

  const fromUri = extensionFromFileName(asset.uri.split("?")[0] ?? asset.uri);
  if (fromUri && MIME_BY_EXT[fromUri]) return MIME_BY_EXT[fromUri];

  return "image/jpeg";
}

export function defaultLotPhotoFileName(mimeType: string, now = Date.now()): string {
  const ext = EXT_BY_MIME[mimeType.toLowerCase()] ?? ".jpg";
  return `lot-photo-${now}${ext}`;
}

export function normalizeImagePickerAsset(asset: ImagePickerAsset, now = Date.now()): NormalizedImageAsset {
  const mimeType = inferMimeType(asset);
  const rawName = asset.fileName?.trim();
  const fileName =
    rawName && extensionFromFileName(rawName) ? rawName : defaultLotPhotoFileName(mimeType, now);

  return {
    uri: asset.uri,
    fileName,
    mimeType,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    fileSize: asset.fileSize ?? undefined,
  };
}

export function normalizeDraftImageAsset(image: {
  uri: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}): NormalizedImageAsset {
  const mimeType = image.mimeType ?? inferMimeType({ uri: image.uri, fileName: image.fileName, mimeType: image.mimeType });
  const fileName =
    image.fileName && extensionFromFileName(image.fileName)
      ? image.fileName
      : defaultLotPhotoFileName(mimeType);

  return {
    uri: image.uri,
    fileName,
    mimeType,
    width: image.width,
    height: image.height,
    fileSize: image.fileSize,
  };
}
