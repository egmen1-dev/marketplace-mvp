import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  getSessionUser,
  requireSellerSession,
  SellerRequiredError,
} from "@/features/auth";
import {
  buildAvatarImagePathname,
  buildProductImagePathname,
  getStorage,
  isBlobConfigured,
  PRODUCT_IMAGE_LIMITS,
  StorageError,
  validateImageFile,
} from "@/lib/storage";

function authErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof AuthRequiredError) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (err instanceof SellerRequiredError) {
    return NextResponse.json(
      { error: "Нужен профиль продавца" },
      { status: 403 },
    );
  }
  return null;
}

function storageErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof StorageError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status },
    );
  }
  return null;
}

/**
 * POST /api/uploads
 * multipart/form-data with field `file`
 * - purpose=avatar: any authenticated user → avatars/
 * - default: seller session → products/
 * Returns `{ url, pathname }`.
 */
export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Ожидается multipart/form-data" },
        { status: 400 },
      );
    }

    const purposeRaw = formData.get("purpose");
    const purpose =
      typeof purposeRaw === "string" ? purposeRaw.trim().toLowerCase() : "";
    const isAvatar = purpose === "avatar";

    try {
      if (isAvatar) {
        const user = await getSessionUser();
        if (!user) throw new AuthRequiredError();
      } else {
        await requireSellerSession();
      }
    } catch (err) {
      const res = authErrorResponse(err);
      if (res) return res;
      throw err;
    }

    if (!isBlobConfigured()) {
      return NextResponse.json(
        {
          error:
            "Хранилище изображений не настроено. Добавьте BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob).",
          code: "NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Поле file обязательно" },
        { status: 400 },
      );
    }

    let contentType: ReturnType<typeof validateImageFile>["contentType"];
    let extension: string;
    try {
      ({ contentType, extension } = validateImageFile({
        name: file.name,
        type: file.type,
        size: file.size,
      }));
    } catch (err) {
      const res = storageErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const pathname = isAvatar
      ? buildAvatarImagePathname(extension)
      : buildProductImagePathname(extension);
    const storage = getStorage();
    const result = await storage.upload({
      data: file,
      pathname,
      contentType,
      filename: file.name,
    });

    return NextResponse.json(
      { url: result.url, pathname: result.pathname },
      { status: 201 },
    );
  } catch (err) {
    const storageRes = storageErrorResponse(err);
    if (storageRes) return storageRes;
    console.error("[POST /api/uploads]", err);
    return NextResponse.json(
      { error: "Не удалось загрузить изображение" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/uploads?url=...
 * Removes a blob we own.
 * - Avatar URLs (avatars/): any authenticated owner session
 * - Product images: seller session
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url")?.trim();
    if (!url) {
      return NextResponse.json(
        { error: "Параметр url обязателен" },
        { status: 400 },
      );
    }

    const isAvatarUrl = /\/avatars\//.test(url);

    try {
      if (isAvatarUrl) {
        const user = await getSessionUser();
        if (!user) throw new AuthRequiredError();
      } else {
        await requireSellerSession();
      }
    } catch (err) {
      const res = authErrorResponse(err);
      if (res) return res;
      throw err;
    }

    if (!isBlobConfigured()) {
      return NextResponse.json(
        {
          error:
            "Хранилище изображений не настроено. Добавьте BLOB_READ_WRITE_TOKEN.",
          code: "NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const storage = getStorage();
    if (!storage.isOwnedUrl(url)) {
      return NextResponse.json(
        { error: "URL не принадлежит нашему хранилищу" },
        { status: 400 },
      );
    }

    await storage.deleteByUrl(url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const storageRes = storageErrorResponse(err);
    if (storageRes) return storageRes;
    console.error("[DELETE /api/uploads]", err);
    return NextResponse.json(
      { error: "Не удалось удалить изображение" },
      { status: 500 },
    );
  }
}

/** Expose limits for clients that want a single source of truth. */
export async function GET() {
  return NextResponse.json({
    maxCount: PRODUCT_IMAGE_LIMITS.maxCount,
    maxBytes: PRODUCT_IMAGE_LIMITS.maxBytes,
    mimeTypes: PRODUCT_IMAGE_LIMITS.mimeTypes,
    configured: isBlobConfigured(),
  });
}
