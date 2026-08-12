import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  getSessionUser,
  requireSellerSession,
  SellerRequiredError,
} from "@/features/auth";
import {
  createProduct,
  listProducts,
  ProductServiceError,
  resolveListStatusFilter,
} from "@/features/products/queries";
import {
  createProductSchema,
  listProductsQuerySchema,
} from "@/features/products/schemas";
import { parseFacetQueryParams } from "@/lib/catalog-taxonomy/facets";

/**
 * GET /api/products
 * Query: q, category, categoryId, priceMin, priceMax, city, seller, condition,
 *        inStock, sort (popular|newest|price_asc|price_desc), page, limit|pageSize, offset,
 *        status, sellerId
 *
 * Anonymous / public: status forced to ACTIVE.
 * Seller (own sellerId) / Admin: may filter by status (including ALL).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());
    const parsed = listProductsQuerySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Некорректные параметры запроса",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const q = parsed.data;
    const facets = parseFacetQueryParams(searchParams);
    const session = await getSessionUser();
    const status = resolveListStatusFilter(
      q.status,
      session
        ? {
            userId: session.id,
            role: session.role,
            sellerProfileId: session.sellerProfileId,
          }
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
      pageSize: q.pageSize,
      limit: q.limit,
      offset: q.offset,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json(
      { error: "Не удалось получить товары" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/products
 * Requires SELLER (or ADMIN) session. Body sellerId is ignored — uses session SellerProfile.
 */
export async function POST(request: Request) {
  try {
    let sellerProfileId: string;
    try {
      const seller = await requireSellerSession();
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ожидается JSON-тело запроса" },
        { status: 400 },
      );
    }

    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Ошибка валидации",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const product = await createProduct({
      ...parsed.data,
      sellerId: sellerProfileId,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[POST /api/products]", err);
    return NextResponse.json(
      { error: "Не удалось создать товар" },
      { status: 500 },
    );
  }
}
