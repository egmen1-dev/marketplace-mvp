import { NextResponse } from "next/server";
import { ProductStatus } from "@prisma/client";

import {
  AuthRequiredError,
  requireSellerFromRequest,
  SellerRequiredError,
} from "@/features/auth/resolve-request-user";
import { createProduct, ProductServiceError } from "@/features/products/queries";
import { createProductSchema } from "@/features/products/schemas";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildSellerProductPublishContract } from "@/lib/mobile/seller-product-publish";
import { buildMobileSellerProductsFromRequest } from "@/lib/mobile/seller-products-data";
import { prisma } from "@/lib/prisma";

async function loadModerationState(productId: string) {
  const moderation = await prisma.productModeration.findUnique({
    where: { productId },
    select: { status: true },
  });
  return moderation?.status ?? null;
}

async function enrichSellerProductResponse(
  product: { id: string; status: ProductStatus },
  message?: string,
) {
  const moderationState = await loadModerationState(product.id);
  const publish = buildSellerProductPublishContract({
    id: product.id,
    status: product.status,
    moderationState,
  });
  return withMobileApiContract(
    {
      product,
      message,
      ...publish,
    },
    `seller-product-${product.id}`,
  );
}

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const page = await buildMobileSellerProductsFromRequest(
    request,
    searchParams.get("cursor"),
    searchParams.get("tab"),
  );
  return NextResponse.json(withMobileApiContract(page, `seller-products-p${searchParams.get("cursor") ?? "1"}`));
}

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  try {
    const seller = await requireSellerFromRequest(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ожидается JSON-тело запроса" }, { status: 400 });
    }

    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const product = await createProduct({
      ...parsed.data,
      sellerId: seller.sellerProfileId,
    });
    const payload = await enrichSellerProductResponse(
      product,
      parsed.data.status === ProductStatus.ACTIVE ? "ЛОТ опубликован" : "Черновик ЛОТа сохранён",
    );

    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    if (err instanceof SellerRequiredError) {
      return NextResponse.json({ error: "Нужен профиль продавца" }, { status: 403 });
    }
    if (err instanceof ProductServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST /api/mobile/seller/products]", err);
    return NextResponse.json({ error: "Не удалось создать ЛОТ" }, { status: 500 });
  }
}
