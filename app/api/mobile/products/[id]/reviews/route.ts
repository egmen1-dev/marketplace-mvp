import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { getPaginatedProductReviews } from "@/lib/marketplace-trust-loop/ratings/paginated-reviews";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id: productId } = await context.params;
  if (!productId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "productId required", retryable: false } },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const page = await getPaginatedProductReviews({
    productId,
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json(
    withMobileApiContract(
      {
        rating: page.rating,
        items: page.items,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      },
      `reviews-${productId}`,
    ),
  );
}
