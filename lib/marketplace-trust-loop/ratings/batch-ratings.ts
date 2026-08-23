import { prisma } from "@/lib/prisma";

import { isMarketplaceTrustLoopEnabled } from "../flags";

export type ProductRatingFields = {
  averageRating: number | null;
  reviewsCount: number;
};

export async function getProductRatingsMap(
  productIds: string[],
): Promise<Map<string, ProductRatingFields>> {
  const map = new Map<string, ProductRatingFields>();
  if (!isMarketplaceTrustLoopEnabled() || productIds.length === 0) {
    return map;
  }

  const ratings = await prisma.productRating.findMany({
    where: { productId: { in: productIds }, reviewsCount: { gt: 0 } },
    select: { productId: true, averageRating: true, reviewsCount: true },
  });

  for (const rating of ratings) {
    map.set(rating.productId, {
      averageRating: Number(rating.averageRating),
      reviewsCount: rating.reviewsCount,
    });
  }

  return map;
}

export function enrichItemsWithRatings<T extends { id: string }>(
  items: T[],
  ratingsMap: Map<string, ProductRatingFields>,
): Array<T & ProductRatingFields> {
  return items.map((item) => {
    const rating = ratingsMap.get(item.id);
    return {
      ...item,
      averageRating: rating?.averageRating ?? null,
      reviewsCount: rating?.reviewsCount ?? 0,
    };
  });
}
