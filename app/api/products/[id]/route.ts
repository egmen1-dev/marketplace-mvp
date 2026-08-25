import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  requireSellerFromRequest,
  resolveRequestUser,
  SellerRequiredError,
} from "@/features/auth/resolve-request-user";
import {
  deleteProduct,
  getProductById,
  ProductServiceError,
  updateProduct,
} from "@/features/products/queries";
import { getProductRatingsMap } from "@/lib/marketplace-trust-loop/ratings/batch-ratings";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { requestIdFromHeaders, withRouteTiming } from "@/lib/api/route-timing";
import { updateProductSchema } from "@/features/products/schemas";
import { log } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/products/[id]
 * Product detail — ACTIVE for anonymous; owner seller / admin may see drafts etc.
 */
export async function GET(request: Request, context: RouteContext) {
  const requestId = requestIdFromHeaders(request);
  return withRouteTiming(
    { route: "/api/products/:id", method: "GET", requestId },
    async () => {
      try {
        const { id } = await context.params;
        if (!id) {
          return NextResponse.json({ error: "id обязателен" }, { status: 400 });
        }

        const session = await resolveRequestUser(request);
        const product = await getProductById(
          id,
          session
            ? {
                userId: session.id,
                role: session.role,
                sellerProfileId: session.sellerProfileId,
              }
            : null,
        );
        if (!product) {
          return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
        }

        let averageRating: number | null = null;
        let reviewsCount = 0;
        try {
          const ratingsMap = await getProductRatingsMap([product.id]);
          const rating = ratingsMap.get(product.id);
          averageRating = rating?.averageRating ?? null;
          reviewsCount = rating?.reviewsCount ?? 0;
        } catch (ratingErr) {
          log.warn("product_pdp_ratings_failed", {
            requestId: requestId ?? undefined,
            productId: id,
            errorMessage:
              ratingErr instanceof Error ? ratingErr.message.slice(0, 160) : "unknown",
          });
        }

        return NextResponse.json({
          ...product,
          averageRating,
          reviewsCount,
        });
      } catch (err) {
        const prismaError = mapPrismaError(err);
        log.error("product_pdp_unexpected", {
          requestId: requestId ?? undefined,
          errorName: err instanceof Error ? err.name : "unknown",
          errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
          prismaCode: prismaError?.prismaCode,
        });
        console.error("[GET /api/products/:id]", err);
        return NextResponse.json(
          {
            error: prismaError?.message ?? "Не удалось получить товар",
            code: prismaError?.code,
            prismaCode: prismaError?.prismaCode,
          },
          { status: prismaError?.status ?? 500 },
        );
      }
    },
  );
}

/**
 * PATCH /api/products/[id]
 * Update owned product. Requires seller session.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    let sellerProfileId: string;
    try {
      const seller = await requireSellerFromRequest(request);
      sellerProfileId = seller.sellerProfileId;
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      if (err instanceof SellerRequiredError) {
        return NextResponse.json(
          { error: "Нужен профиль продавца" },
          { status: 403 },
        );
      }
      throw err;
    }

    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ожидается JSON-тело запроса" },
        { status: 400 },
      );
    }

    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Ошибка валидации",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const product = await updateProduct(id, sellerProfileId, parsed.data);
    return NextResponse.json(product);
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[PATCH /api/products/:id]", err);
    return NextResponse.json(
      { error: "Не удалось обновить товар" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Hard-delete owned product. Requires seller session.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    let sellerProfileId: string;
    try {
      const seller = await requireSellerFromRequest(request);
      sellerProfileId = seller.sellerProfileId;
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      if (err instanceof SellerRequiredError) {
        return NextResponse.json(
          { error: "Нужен профиль продавца" },
          { status: 403 },
        );
      }
      throw err;
    }

    const { id } = await context.params;
    await deleteProduct(id, sellerProfileId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[DELETE /api/products/:id]", err);
    return NextResponse.json(
      { error: "Не удалось удалить товар" },
      { status: 500 },
    );
  }
}
