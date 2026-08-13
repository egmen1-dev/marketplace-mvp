import { isMarketplaceTrustLoopEnabled } from "../flags";
import type { TrustSignalsSnapshot } from "../reviews/types";
import { getProductRatingSnapshot } from "../ratings/product-rating";
import { getSellerReputationSnapshot } from "../ratings/seller-rating";

export async function buildTrustSignals(input: {
  sellerId: string;
  productId: string;
  isVerified: boolean;
}): Promise<TrustSignalsSnapshot | null> {
  if (!isMarketplaceTrustLoopEnabled()) return null;

  const [rating, reputation] = await Promise.all([
    getProductRatingSnapshot(input.productId),
    getSellerReputationSnapshot(input.sellerId),
  ]);

  return {
    verifiedSeller: input.isVerified,
    completedOrders: reputation?.completedOrders ?? 0,
    satisfactionPercent: reputation?.satisfactionPercent ?? 0,
    hasBuyerPhotos: (rating?.reviewsCount ?? 0) > 0,
    productRating: rating?.averageRating ?? null,
    reviewsCount: rating?.reviewsCount ?? 0,
  };
}
