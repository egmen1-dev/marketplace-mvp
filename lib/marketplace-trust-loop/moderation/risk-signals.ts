import { isMarketplaceTrustLoopEnabled } from "../flags";
import type { TrustSignalsSnapshot } from "../reviews/types";
import { getProductRatingSnapshot } from "../ratings/product-rating";
import { getSellerReputationSnapshot } from "../ratings/seller-rating";
import {
  buildVerificationDetails,
  getBuyerSellerTrustSnapshot,
  isMarketplaceTrustScoreModelEnabled,
} from "@/lib/marketplace-trust-score";

export async function buildTrustSignals(input: {
  sellerId: string;
  productId: string;
  isVerified: boolean;
}): Promise<TrustSignalsSnapshot | null> {
  if (!isMarketplaceTrustLoopEnabled()) return null;

  if (isMarketplaceTrustScoreModelEnabled()) {
    const buyerTrust = await getBuyerSellerTrustSnapshot(input.sellerId);
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
      trustScore: buyerTrust?.trustScore ?? reputation?.trustScore ?? 70,
      trustLevel: buyerTrust?.trustLevel ?? reputation?.trustLabel ?? "Хороший уровень доверия",
      buyerReasons: buyerTrust?.reasons ?? [],
      verificationDetails:
        buyerTrust?.verificationDetails ??
        buildVerificationDetails({
          phoneVerified: false,
          paymentVerified: false,
          isVerified: input.isVerified,
          completedOrders: reputation?.completedOrders ?? 0,
        }),
    };
  }

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
