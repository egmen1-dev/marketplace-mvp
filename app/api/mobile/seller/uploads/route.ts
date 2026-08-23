import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  requireSellerFromRequest,
  SellerRequiredError,
} from "@/features/auth/resolve-request-user";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import {
  buildProductImagePathname,
  getStorage,
  isBlobConfigured,
  PRODUCT_IMAGE_LIMITS,
  StorageError,
  validateImageFile,
} from "@/lib/storage";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "Загрузка изображений временно недоступна", code: "NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  try {
    const seller = await requireSellerFromRequest(request);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!isUploadedFile(file)) {
      return NextResponse.json({ error: "Поле file обязательно" }, { status: 400 });
    }

    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const { contentType, extension } = validateImageFile({
      name: file.name,
      type: file.type,
      size: file.size,
      magicBytes: header,
    });

    const pathname = buildProductImagePathname(extension, seller.sellerProfileId);
    const storage = getStorage();
    const result = await storage.upload({
      data: file,
      pathname,
      contentType,
      filename: file.name,
    });

    log.info("mobile_seller_upload_ok", {
      sellerProfileId: seller.sellerProfileId,
      pathname: result.pathname,
      size: file.size,
    });

    return NextResponse.json(
      withMobileApiContract(
        { url: result.url, pathname: result.pathname, maxCount: PRODUCT_IMAGE_LIMITS.maxCount },
        `seller-upload-${seller.sellerProfileId}`,
      ),
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    if (err instanceof SellerRequiredError) {
      return NextResponse.json({ error: "Нужен профиль продавца" }, { status: 403 });
    }
    if (err instanceof StorageError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST /api/mobile/seller/uploads]", err);
    return NextResponse.json({ error: "Не удалось загрузить изображение" }, { status: 500 });
  }
}
