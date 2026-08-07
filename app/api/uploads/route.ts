import { UserRole } from "@prisma/client";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  getSessionUser,
  loadUserAuthFromDb,
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

export const runtime = "nodejs";

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
      error: "Загрузка изображений временно недоступна",
      code: "NOT_CONFIGURED",
    },
    { status: 503 },
  );
}

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    typeof (value as File).size === "number" &&
    "name" in value
  );
}

function parseClientPayload(raw: string | null): { purpose: string } {
  if (!raw) return { purpose: "product" };
  try {
    const parsed = JSON.parse(raw) as { purpose?: unknown };
    const purpose =
      typeof parsed.purpose === "string"
        ? parsed.purpose.trim().toLowerCase()
        : "product";
    return { purpose };
  } catch {
    return { purpose: "product" };
  }
}

/**
 * Client-direct Blob uploads (JSON body from @vercel/blob/client `upload()`).
 * Avoids Vercel serverless ~4.5MB request body limit that caused HTTP 413.
 */
async function handleClientTokenUpload(request: Request): Promise<NextResponse> {
  if (!isBlobConfigured()) {
    return blobNotConfiguredResponse();
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const eventType = body?.type ?? "unknown";
  log.info("upload_client_event", {
    method: "POST",
    eventType,
  });

  try {
    const rwToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!rwToken) {
      return blobNotConfiguredResponse();
    }

    const jsonResponse = await handleUpload({
      token: rwToken,
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { purpose } = parseClientPayload(clientPayload);
        const isAvatar = purpose === "avatar";

        let ownerId: string;
        let expectedPrefix: string;
        try {
          if (isAvatar) {
            const user = await getSessionUser();
            if (!user) throw new AuthRequiredError();
            ownerId = user.id;
            expectedPrefix = `avatars/${safeId(ownerId)}/`;
          } else {
            const seller = await requireSellerSession();
            ownerId = seller.sellerProfileId;
            expectedPrefix = `products/${safeId(ownerId)}/`;
          }
        } catch (err) {
          if (err instanceof AuthRequiredError) {
            throw new Error("Требуется вход");
          }
          if (err instanceof SellerRequiredError) {
            throw new Error("Нужен профиль продавца");
          }
          throw err;
        }

        if (!pathname.startsWith(expectedPrefix)) {
          log.warn("upload_path_rejected", {
            purpose,
            ownerId,
            pathnamePrefix: pathname.slice(0, 48),
          });
          throw new Error("Некорректный путь загрузки");
        }

        const ext = /\.[a-zA-Z0-9]+$/.exec(pathname)?.[0]?.toLowerCase();
        if (
          !ext ||
          !(PRODUCT_IMAGE_LIMITS.extensions as readonly string[]).includes(ext)
        ) {
          throw new Error("Допустимы JPEG, PNG, WebP и GIF");
        }

        // Absolute expiry — relative values like `60000` cause Access denied.
        const validUntil = Date.now() + 60 * 60 * 1000;

        log.info("upload_token_issued", {
          method: "POST",
          purpose,
          ownerId,
          pathname,
          maxBytes: PRODUCT_IMAGE_LIMITS.maxBytes,
          validUntil,
        });

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/*",
          ],
          maximumSizeInBytes: PRODUCT_IMAGE_LIMITS.maxBytes,
          addRandomSuffix: false,
          allowOverwrite: true,
          validUntil,
          tokenPayload: JSON.stringify({ purpose, ownerId }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        try {
          log.info("upload_blob_completed", {
            method: "POST",
            pathname: blob.pathname,
            contentType: blob.contentType,
            urlHost: (() => {
              try {
                return new URL(blob.url).host;
              } catch {
                return "invalid";
              }
            })(),
            status: "ok",
          });
        } catch {
          // Never fail the webhook — client already has the blob URL.
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;

    const message = err instanceof Error ? err.message : "unknown";
    log.error("upload_client_failed", {
      method: "POST",
      message: message.slice(0, 200),
    });

    const friendly =
      /вход|продавца|путь|JPEG|PNG|WebP|GIF|недоступна/i.test(message)
        ? message
        : "Не удалось подготовить загрузку";

    return NextResponse.json({ error: friendly }, { status: 400 });
  }
}

/**
 * Legacy multipart upload through the serverless function (local / small files).
 * On Vercel production, prefer client-direct upload — body limit ~4.5MB → 413.
 */
async function handleMultipartUpload(request: Request): Promise<NextResponse> {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      log.warn("upload_multipart_parse_failed", { method: "POST" });
      return NextResponse.json(
        {
          error:
            "Не удалось принять файл. Обновите страницу и попробуйте снова.",
          code: "PAYLOAD_ERROR",
        },
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
    if (!isUploadedFile(file)) {
      return NextResponse.json(
        { error: "Поле file обязательно" },
        { status: 400 },
      );
    }

    log.info("upload_multipart_received", {
      method: "POST",
      purpose: isAvatar ? "avatar" : "product",
      filename: file.name?.slice(0, 120) || "unknown",
      size: file.size,
      contentType: file.type || "unknown",
    });

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

    log.info("upload_multipart_blob_ok", {
      method: "POST",
      pathname: result.pathname,
      contentType,
      size: file.size,
      status: "ok",
    });

    return NextResponse.json(
      { url: result.url, pathname: result.pathname },
      { status: 201 },
    );
  } catch (err) {
    const storageRes = storageErrorResponse(err);
    if (storageRes) return storageRes;
    log.error("upload_failed", {
      method: "POST",
      message: err instanceof Error ? err.message.slice(0, 200) : "unknown",
    });
    return NextResponse.json(
      { error: "Не удалось загрузить изображение" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/uploads
 * - application/json → client token flow (@vercel/blob/client upload)
 * - multipart/form-data → legacy server put (may 413 on Vercel if body > ~4.5MB)
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return handleClientTokenUpload(request);
  }
  return handleMultipartUpload(request);
}

/**
 * DELETE /api/uploads?url=...
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
    log.info("upload_delete_ok", {
      method: "DELETE",
      pathname: pathname ?? "unknown",
      status: "ok",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const storageRes = storageErrorResponse(err);
    if (storageRes) return storageRes;
    log.error("upload_delete_failed", {
      method: "DELETE",
      message: err instanceof Error ? err.message.slice(0, 200) : "unknown",
    });
    return NextResponse.json(
      { error: "Не удалось удалить изображение" },
      { status: 500 },
    );
  }
}

/** Expose limits + path prefixes for authenticated client-direct uploads. */
export async function GET() {
  const configured = isBlobConfigured();
  const base = {
    maxCount: PRODUCT_IMAGE_LIMITS.maxCount,
    maxBytes: PRODUCT_IMAGE_LIMITS.maxBytes,
    mimeTypes: PRODUCT_IMAGE_LIMITS.mimeTypes,
    configured,
  };

  if (!configured) {
    return NextResponse.json(base);
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(base);
  }

  // Prefer DB seller id — JWT sellerProfileId can be stale after onboarding.
  const dbUser = await loadUserAuthFromDb(user.id);

  return NextResponse.json({
    ...base,
    productPathPrefix: dbUser?.sellerProfileId
      ? `products/${safeId(dbUser.sellerProfileId)}/`
      : null,
    avatarPathPrefix: `avatars/${safeId(user.id)}/`,
  });
}
