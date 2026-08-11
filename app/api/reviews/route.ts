import { NextResponse } from "next/server";

import { listProductReviews } from "@/features/reviews/queries";
import { reviewSortSchema } from "@/features/reviews/schemas";

/**
 * GET /api/reviews?productId=&sort=&page=&pageSize=
 * Public: returns PUBLISHED reviews for a product (paginated).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    if (!productId) {
      return NextResponse.json({ error: "productId обязателен" }, { status: 400 });
    }
    const sort = reviewSortSchema.parse(searchParams.get("sort") ?? undefined);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("pageSize")) || 5, 1),
      50,
    );

    const result = await listProductReviews(productId, { sort, page, pageSize });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/reviews]", err);
    return NextResponse.json(
      { error: "Не удалось загрузить отзывы" },
      { status: 500 },
    );
  }
}
