import type { ProductDetail } from "@/features/products/types";
import { computeProductCompletenessScore } from "@/lib/conversion";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";
import { getProductRatingSnapshot } from "@/lib/marketplace-trust-loop/ratings/product-rating";
import { prisma } from "@/lib/prisma";

import { isMarketplaceUxCompletionEnabled } from "./flags";
import type { PdpFitUx, PdpTrustUx } from "./types";

export async function buildPdpTrustUx(input: {
  product: ProductDetail;
  sellerVerified: boolean;
}): Promise<PdpTrustUx> {
  if (!isMarketplaceUxCompletionEnabled()) {
    return { enabled: false, sellerScore: null, productScore: null, reasons: [] };
  }

  const reasons: string[] = [];
  if (input.sellerVerified) reasons.push("✓ Проверенный продавец");

  const completeness = computeProductCompletenessScore({
    photoCount: input.product.images.length,
    titleLength: input.product.title.length,
    descriptionLength: (input.product.description ?? "").length,
    characteristicCount: input.product.characteristics.length,
    hasCategory: Boolean(input.product.category),
    hasProductType: Boolean(input.product.productType),
    price: input.product.price,
    hasSeller: true,
  });

  let productScore = completeness.score;
  if (completeness.score >= 70) reasons.push("✓ Полное описание");
  reasons.push("✓ Есть доставка");

  if (isMarketplaceTrustLoopEnabled()) {
    const rating = await getProductRatingSnapshot(input.product.id);
    if (rating && rating.averageRating >= 4) {
      reasons.push(`✓ Рейтинг ${rating.averageRating.toFixed(1)}`);
      productScore = Math.min(100, productScore + 10);
    }
  }

  let sellerScore: number | null = null;
  const reputation = await prisma.sellerReputation.findUnique({
    where: { sellerId: input.product.seller.id },
    select: { trustScore: true },
  });
  sellerScore = reputation?.trustScore ?? (input.sellerVerified ? 85 : 70);
  if (sellerScore >= 80) reasons.unshift("✓ Надёжный продавец");

  return {
    enabled: true,
    sellerScore,
    productScore,
    reasons: reasons.slice(0, 4),
  };
}

export async function buildPdpFitUx(input: {
  product: ProductDetail;
  userId?: string | null;
}): Promise<PdpFitUx> {
  if (!isMarketplaceUxCompletionEnabled()) {
    return { enabled: false, reasons: [] };
  }

  const reasons: string[] = [];
  reasons.push("✓ В вашем бюджете");

  if (input.userId) {
    const views = await prisma.productView.findMany({
      where: { userId: input.userId },
      take: 20,
      select: { product: { select: { categoryId: true, price: true } } },
    });
    const sameCategory = views.some(
      (v) => v.product.categoryId === input.product.category?.id,
    );
    if (sameCategory) {
      reasons.push("✓ Похож на товары, которые вы смотрели");
    }
  }

  if (input.product.category) {
    reasons.push(`✓ Подходит для сценария «${input.product.category.name}»`);
  }

  return { enabled: true, reasons: reasons.slice(0, 3) };
}

export const PURCHASE_EDUCATION_STEPS = [
  "Оплата",
  "Отправка продавцом",
  "Доставка",
  "Проверка",
  "Отзыв",
];
