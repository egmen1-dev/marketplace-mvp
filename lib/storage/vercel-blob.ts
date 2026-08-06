import { del, put } from "@vercel/blob";

import {
  StorageError,
  type StorageProvider,
  type UploadInput,
  type UploadResult,
} from "./types";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

function requireToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token?.trim()) {
    throw new StorageError(
      "NOT_CONFIGURED",
      "Хранилище изображений не настроено. Добавьте BLOB_READ_WRITE_TOKEN (Vercel Blob) в .env или в переменные окружения проекта на Vercel.",
      503,
    );
  }
  return token;
}

export function createVercelBlobStorage(): StorageProvider {
  return {
    async upload(input: UploadInput): Promise<UploadResult> {
      const token = requireToken();
      try {
        const blob = await put(input.pathname, input.data, {
          access: "public",
          contentType: input.contentType,
          token,
          addRandomSuffix: false,
        });
        return { url: blob.url, pathname: blob.pathname };
      } catch (err) {
        if (err instanceof StorageError) throw err;
        console.error("[storage/vercel-blob] upload failed", err);
        throw new StorageError(
          "UPLOAD_FAILED",
          "Не удалось загрузить файл в хранилище",
          502,
        );
      }
    },

    async deleteByUrl(url: string): Promise<void> {
      const token = requireToken();
      if (!this.isOwnedUrl(url)) {
        return;
      }
      try {
        await del(url, { token });
      } catch (err) {
        console.error("[storage/vercel-blob] delete failed", err);
        throw new StorageError(
          "DELETE_FAILED",
          "Не удалось удалить файл из хранилища",
          502,
        );
      }
    },

    isOwnedUrl(url: string): boolean {
      try {
        const { hostname, protocol } = new URL(url);
        return (
          protocol === "https:" &&
          (hostname.endsWith(BLOB_HOST_SUFFIX) ||
            hostname === "blob.vercel-storage.com")
        );
      } catch {
        return false;
      }
    },
  };
}
