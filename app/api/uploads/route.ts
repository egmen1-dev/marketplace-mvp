import { UserRole } from "@prisma/client";
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
  isAvatarPathOwnedByUser,
  isBlobConfigured,
  isProductPathOwnedBySeller,
  pathnameFromBlobUrl,
  PRODUCT_IMAGE_LIMITS,
  StorageError,
  validateImageFile,
} from "@/lib/storage";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

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

function blobNotConfiguredResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Загрузка изображений временно недоступна. Можно сохранить товар без фото — вместо него будет показана заглушка.",
      code: "NOT_CONFIGURED",
    },
    { status: 503 },
  );
}

/**
 * POST /api/uploads
 * multipart/form-data with field `file`
 * - purpose=avatar: any authenticated user → avatars/{userId}/
 * - default: seller session → products/{sellerId}/
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

    let ownerId: string;
    try {
      if (isAvatar) {
        const user = await getSessionUser();
        if (!user) throw new AuthRequiredError();
        ownerId = user.id;
      } else {
        const seller = await requireSellerSession();
        ownerId = seller.sellerProfileId;
      }
    } catch (err) {
      const res = authErrorResponse(err);
      if (res) return res;
      throw err;
    }

    if (!isBlobConfigured()) {
      return blobNotConfiguredResponse();
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Поле file обязательно" },
        { status: 400 },
      );
    }

    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());

    let contentType: ReturnType<typeof validateImageFile>["contentType"];
    let extension: string;
    try {
      ({ contentType, extension } = validateImageFile({
        name: file.name,
        type: file.type,
        size: file.size,
        magicBytes: header,
      }));
    } catch (err) {
      const res = storageErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const pathname = isAvatar
      ? buildAvatarImagePathname(extension, ownerId)
      : buildProductImagePathname(extension, ownerId);
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
    log.error("upload_failed", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "Не удалось загрузить изображение" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/uploads?url=...
 * Ownership required:
 * - Avatar: pathname under avatars/{userId}/
 * - Product: pathname under products/{sellerId}/ OR image row owned by seller's product
 * - ADMIN: may delete any owned-storage URL
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

    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    if (!isBlobConfigured()) {
      return blobNotConfiguredResponse();
    }

    const storage = getStorage();
    if (!storage.isOwnedUrl(url)) {
      return NextResponse.json(
        { error: "URL не принадлежит нашему хранилищу" },
        { status: 400 },
      );
    }

    const pathname =
      pathnameFromBlobUrl(url) ??
      (
        await prisma.productImage.findFirst({
          where: { url },
          select: { pathname: true },
        })
      )?.pathname ??
      null;

    const isAvatarUrl = Boolean(
      pathname?.startsWith("avatars/") || /\/avatars\//.test(url),
    );

    let allowed = false;

    if (session.role === UserRole.ADMIN) {
      allowed = true;
    } else if (isAvatarUrl) {
      allowed = pathname
        ? isAvatarPathOwnedByUser(pathname, session.id)
        : false;
    } else {
      let sellerProfileId = session.sellerProfileId;
      try {
        const seller = await requireSellerSession();
        sellerProfileId = seller.sellerProfileId;
      } catch (err) {
        const res = authErrorResponse(err);
        if (res) return res;
        throw err;
      }

      if (pathname && isProductPathOwnedBySeller(pathname, sellerProfileId!)) {
        allowed = true;
      } else {
        const image = await prisma.productImage.findFirst({
          where: { url },
          select: {
            product: { select: { sellerId: true } },
          },
        });
        if (image?.product.sellerId === sellerProfileId) {
          allowed = true;
        }
      }
    }

    if (!allowed) {
      log.warn("upload_ownership_violation", {
        userId: session.id,
        role: session.role,
        pathname: pathname ?? undefined,
      });
      return NextResponse.json(
        { error: "Нельзя удалить чужое изображение", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    await storage.deleteByUrl(url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const storageRes = storageErrorResponse(err);
    if (storageRes) return storageRes;
    log.error("upload_delete_failed", {
      message: err instanceof Error ? err.message : "unknown",
    });
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
