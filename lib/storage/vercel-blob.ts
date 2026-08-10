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
      "Загрузка изображений временно недоступна. Попробуйте позже или сохраните товар без фото.",
      503,
    );
  }
  return token;
}

export function createVercelBlobStorage(): StorageProvider {
  const provider: StorageProvider = {
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

    async delete(url: string): Promise<void> {
      const token = requireToken();
      if (!provider.isOwnedUrl(url)) {
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

    async deleteByUrl(url: string): Promise<void> {
      return provider.delete(url);
    },

    getUrl(pathname: string): string | null {
      // Blob public host is store-specific; absolute URLs come from upload().
      if (/^https?:\/\//i.test(pathname)) {
        return pathname;
      }
      return null;
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
  return provider;
}
