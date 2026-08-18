import { loadAppConfig } from "../../config/env";
import { apiRequest } from "../../api/client";

export type UploadedProductImage = {
  url: string;
  pathname: string;
};

export async function uploadProductImageFromUri(
  localUri: string,
  fileName = "product.jpg",
): Promise<UploadedProductImage> {
  const config = loadAppConfig();
  const formData = new FormData();
  formData.append("purpose", "product");
  formData.append(
    "file",
    {
      uri: localUri,
      name: fileName,
      type: "image/jpeg",
    } as unknown as Blob,
  );

  const token = await import("../../storage/secure-session").then((m) => m.getAccessToken());
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${config.apiBaseUrl}/api/uploads`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Не удалось загрузить изображение");
  }

  const data = (await res.json()) as { url: string; pathname?: string };
  return {
    url: data.url,
    pathname: data.pathname ?? data.url,
  };
}
