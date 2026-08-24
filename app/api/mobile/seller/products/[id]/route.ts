import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  requireSellerFromRequest,
  SellerRequiredError,
} from "@/features/auth/resolve-request-user";
import { getProductById, ProductServiceError, updateProduct } from "@/features/products/queries";
import { updateProductSchema } from "@/features/products/schemas";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildSellerProductPublishContract } from "@/lib/mobile/seller-product-publish";
import { buildMobileSellerProductDetailFromRequest } from "@/lib/mobile/seller-products-data";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function loadModerationState(productId: string) {
  const moderation = await prisma.productModeration.findUnique({
    where: { productId },
    select: { status: true },
  });
  return moderation?.status ?? null;
}

async function enrichSellerProductResponse(
  product: { id: string; status: import("@prisma/client").ProductStatus },
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

export async function GET(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;
  const detail = await buildMobileSellerProductDetailFromRequest(request, id);
  if (!detail) {
    return NextResponse.json({ error: "ЛОТ не найден" }, { status: 404 });
  }
  return NextResponse.json(withMobileApiContract(detail, `seller-product-detail-${id}`));
}

export async function PATCH(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;

  try {
    const seller = await requireSellerFromRequest(request);
    const existing = await getProductById(id, {
      userId: seller.userId,
      role: seller.role,
      sellerProfileId: seller.sellerProfileId,
    });
    if (!existing || existing.seller?.id !== seller.sellerProfileId) {
      return NextResponse.json({ error: "ЛОТ не найден" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ожидается JSON-тело запроса" }, { status: 400 });
    }

    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const product = await updateProduct(id, seller.sellerProfileId, parsed.data);
      const payload = await enrichSellerProductResponse(product, "ЛОТ обновлён");
      return NextResponse.json(payload);
    } catch (err) {
      if (err instanceof ProductServiceError && err.code === "MODERATION_PENDING") {
        const product = await getProductById(id, {
          userId: seller.userId,
          role: seller.role,
          sellerProfileId: seller.sellerProfileId,
        });
        if (!product) {
          return NextResponse.json({ error: "ЛОТ не найден" }, { status: 404 });
        }
        const payload = await enrichSellerProductResponse(product, err.message);
        return NextResponse.json(payload, { status: 200 });
      }
      throw err;
    }
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
    console.error("[PATCH /api/mobile/seller/products/:id]", err);
    return NextResponse.json({ error: "Не удалось обновить ЛОТ" }, { status: 500 });
  }
}
