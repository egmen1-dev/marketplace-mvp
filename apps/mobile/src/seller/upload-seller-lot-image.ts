import { File, Paths } from "expo-file-system";

import { loadAppConfig } from "../config/env";
import { getAccessToken } from "../storage/secure-session";
import { extensionFromFileName, type NormalizedImageAsset } from "./normalize-image-picker-asset";

export type SellerLotUploadedImage = {
  id: string;
  url: string;
  pathname: string | null;
  mimeType: string;
  width?: number;
  height?: number;
};

type UploadResponse = {
  id?: string;
  url: string;
  pathname?: string | null;
  mimeType?: string;
  width?: number;
  height?: number;
  error?: string;
};

async function resolveUploadFile(asset: NormalizedImageAsset): Promise<File> {
  const source = new File(asset.uri);
  const hasValidName =
    Boolean(extensionFromFileName(source.name)) && source.name === asset.fileName;

  if (hasValidName && source.uri === asset.uri) {
    return source;
  }

  const dest = new File(Paths.cache, asset.fileName);
  await source.copy(dest, { overwrite: true });
  return dest;
}

export async function uploadSellerLotImage(asset: NormalizedImageAsset): Promise<SellerLotUploadedImage> {
  const config = loadAppConfig();
  const token = await getAccessToken();
  const uploadFile = await resolveUploadFile(asset);

  const form = new FormData();
  form.append("file", uploadFile);

  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}/api/mobile/seller/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch {
    throw new Error("Не удалось загрузить фото");
  }

  const body = (await res.json().catch(() => ({}))) as UploadResponse;
  if (!res.ok) {
    throw new Error(body.error ?? "Не удалось загрузить фото");
  }

  if (!body.url) {
    throw new Error("Не удалось загрузить фото");
  }

  return {
    id: body.id ?? body.pathname ?? body.url,
    url: body.url,
    pathname: body.pathname ?? null,
    mimeType: body.mimeType ?? asset.mimeType,
    width: body.width ?? asset.width,
    height: body.height ?? asset.height,
  };
}
