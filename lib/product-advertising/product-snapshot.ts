import type { ProductStatus } from "@prisma/client";

import {
  evaluateProductAdvertisingEligibility,
  type ProductAdvertisingEligibility,
} from "./eligibility";
import {
  computeCardQualityScore,
  type CardQualityBreakdown,
} from "./quality-score";

/** Minimal product shape for eligibility + quality (DB or form). */
export type ProductAdSnapshotSource = {
  status: ProductStatus;
  stock: number;
  price: number;
  title: string;
  description?: string | null;
  productTypeId?: string | null;
  categoryId?: string | null;
  imageCount: number;
  sellerId?: string | null;
  sellerBlocked?: boolean;
  sellerVerified?: boolean;
  sellerCompletedOrders?: number;
  characteristicCount?: number;
  requiredCharacteristicCount?: number;
  filledRequiredCharacteristicCount?: number;
};

export type ProductAdSnapshot = {
  eligibility: ProductAdvertisingEligibility;
  quality: CardQualityBreakdown;
};

export function buildProductAdSnapshot(
  source: ProductAdSnapshotSource,
): ProductAdSnapshot {
  const eligibility = evaluateProductAdvertisingEligibility({
    status: source.status,
    stock: source.stock,
    price: source.price,
    productTypeId: source.productTypeId,
    imageCount: source.imageCount,
    sellerId: source.sellerId,
    sellerBlocked: source.sellerBlocked,
  });

  const quality = computeCardQualityScore({
    imageCount: source.imageCount,
    titleLength: source.title.trim().length,
    hasCategory: Boolean(source.categoryId),
    hasProductType: Boolean(source.productTypeId),
    characteristicCount: source.characteristicCount ?? 0,
    requiredCharacteristicCount: source.requiredCharacteristicCount ?? 0,
    filledRequiredCharacteristicCount:
      source.filledRequiredCharacteristicCount ?? 0,
    descriptionLength: (source.description ?? "").trim().length,
    stock: source.stock,
    sellerVerified: source.sellerVerified ?? false,
    sellerBlocked: source.sellerBlocked ?? false,
    sellerCompletedOrders: source.sellerCompletedOrders ?? 0,
  });

  return { eligibility, quality };
}
