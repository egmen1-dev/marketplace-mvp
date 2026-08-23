import { ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { isMarketplaceTrustLoopEnabled } from "../flags";
import type { ProductRatingSnapshot, ReviewDto } from "../reviews/types";
import { getProductRatingSnapshot } from "./product-rating";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type ProductReviewsPage = {
  rating: ProductRatingSnapshot | null;
  items: ReviewDto[];
  nextCursor: string | null;
  hasMore: boolean;
};

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const [iso, id] = raw.split("|");
    if (!iso || !id) return null;
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export async function getPaginatedProductReviews(input: {
  productId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<ProductReviewsPage> {
  if (!isMarketplaceTrustLoopEnabled()) {
    return { rating: null, items: [], nextCursor: null, hasMore: false };
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const decoded = input.cursor ? decodeCursor(input.cursor) : null;

  const [rating, rows] = await Promise.all([
    getProductRatingSnapshot(input.productId),
    prisma.review.findMany({
      where: {
        productId: input.productId,
        status: ReviewStatus.APPROVED,
        ...(decoded
          ? {
              OR: [
                { createdAt: { lt: decoded.createdAt } },
                { createdAt: decoded.createdAt, id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        rating: true,
        text: true,
        pros: true,
        cons: true,
        createdAt: true,
        buyer: { select: { name: true } },
        photos: { select: { id: true, url: true }, take: 4 },
      },
    }),
  ]);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];

  const items: ReviewDto[] = pageRows.map((row) => ({
    id: row.id,
    rating: row.rating,
    text: row.text,
    pros: row.pros,
    cons: row.cons,
    buyerName: row.buyer.name,
    createdAt: row.createdAt.toISOString(),
    photos: row.photos,
  }));

  return {
    rating,
    items,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
    hasMore,
  };
}
