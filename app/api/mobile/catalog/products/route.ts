import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/features/auth/resolve-request-user";
import { listProducts, resolveListStatusFilter } from "@/features/products/queries";
import { listProductsQuerySchema } from "@/features/products/schemas";
import { parseFacetQueryParams } from "@/lib/catalog-taxonomy/facets";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { requestIdFromHeaders, withRouteTiming } from "@/lib/api/route-timing";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { log } from "@/lib/logger";
import { enrichItemsWithRatings, getProductRatingsMap } from "@/lib/marketplace-trust-loop/ratings/batch-ratings";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { parseMobilePageCursor, toMobilePagination } from "@/lib/mobile/pagination";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const requestId = requestIdFromHeaders(request);

  return withRouteTiming(
    { route: "/api/mobile/catalog/products", method: "GET", requestId },
    async () => {
      try {
        const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());
    if (searchParams.get("cursor")) {
      raw.page = String(parseMobilePageCursor(searchParams.get("cursor")));
    }

    const parsed = listProductsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid catalog params", retryable: false } },
        { status: 400 },
      );
    }

    const user = await resolveRequestUser(request);
    const q = parsed.data;
    const facets = parseFacetQueryParams(searchParams);
    const status = resolveListStatusFilter(
      q.status,
      user
        ? { userId: user.id, role: user.role, sellerProfileId: user.sellerProfileId }
        : null,
      q.sellerId,
    );

    const result = await listProducts({
      category: q.category,
      categoryId: q.categoryId,
      sellerId: q.sellerId,
      seller: q.seller,
      sellerKind: q.sellerKind,
      status,
      query: q.q,
      city: q.city,
      condition: q.condition,
      priceMin: q.priceMin,
      priceMax: q.priceMax,
      inStock: q.inStock,
      productType: q.productType,
      productTypeId: q.productTypeId,
      brand: q.brand,
      brandId: q.brandId,
      facets,
      sort: q.sort,
      page: q.page,
      pageSize: q.pageSize ?? 20,
      limit: q.limit,
      offset: q.offset,
    });

    let enrichedItems = result.items;
    try {
      const ratingsMap = await getProductRatingsMap(result.items.map((item) => item.id));
      enrichedItems = enrichItemsWithRatings(result.items, ratingsMap);
    } catch (ratingErr) {
      log.warn("catalog_ratings_failed", {
        requestId: requestId ?? undefined,
        errorMessage:
          ratingErr instanceof Error ? ratingErr.message.slice(0, 160) : "unknown",
      });
    }

        const page = toMobilePagination({ ...result, items: enrichedItems });
        return NextResponse.json(withMobileApiContract(page, `catalog-p${result.page}`));
      } catch (err) {
        const prismaError = mapPrismaError(err);
        log.error("catalog_products_unexpected", {
          requestId: requestId ?? undefined,
          errorName: err instanceof Error ? err.name : "unknown",
          errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
          prismaCode: prismaError?.prismaCode,
          errorCode: prismaError?.code,
        });
        console.error("[GET /api/mobile/catalog/products]", err);
        return NextResponse.json(
          {
            error: {
              code: prismaError?.code ?? "CATALOG_ERROR",
              message: prismaError?.message ?? "Не удалось загрузить каталог",
              retryable: true,
              prismaCode: prismaError?.prismaCode,
            },
          },
          { status: prismaError?.status ?? 500 },
        );
      }
    },
  );
}
