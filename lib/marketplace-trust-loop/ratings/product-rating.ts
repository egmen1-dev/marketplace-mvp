import { ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { ProductRatingSnapshot } from "../reviews/types";

export async function getProductRatingSnapshot(
  productId: string,
): Promise<ProductRatingSnapshot | null> {
  const rating = await prisma.productRating.findUnique({ where: { productId } });
  if (!rating || rating.reviewsCount === 0) return null;

  const total = rating.reviewsCount;
  const dist = [1, 2, 3, 4, 5].map((stars) => {
    const count =
      stars === 1
        ? rating.rating1
        : stars === 2
          ? rating.rating2
          : stars === 3
            ? rating.rating3
            : stars === 4
              ? rating.rating4
              : rating.rating5;
    return {
      stars,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  return {
    averageRating: Number(rating.averageRating),
    reviewsCount: total,
    distribution: dist,
  };
}

export async function listApprovedProductReviews(
  productId: string,
  limit = 5,
): Promise<
  {
    id: string;
    rating: number;
    text: string | null;
    pros: string | null;
    cons: string | null;
    createdAt: Date;
    buyer: { name: string | null };
    photos: { id: string; url: string }[];
  }[]
> {
  return prisma.review.findMany({
    where: { productId, status: ReviewStatus.APPROVED },
    orderBy: { createdAt: "desc" },
    take: limit,
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
  });
}
