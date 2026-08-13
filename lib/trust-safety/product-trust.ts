import { computeCardQualityScore } from "@/lib/product-advertising/quality-score";

import { clampTrustScore } from "./trust-score";
import type { ProductTrustScore } from "./types";

export type ProductTrustInput = {
  imageCount: number;
  title: string;
  description: string | null;
  characteristicCount: number;
  requiredCharacteristicCount: number;
  filledRequiredCharacteristicCount: number;
  hasCategory: boolean;
  hasProductType: boolean;
  stock: number;
  sellerVerified: boolean;
  sellerBlocked: boolean;
  sellerCompletedOrders: number;
  sellerTrustScore: number;
  price: number;
};

export function computeProductTrustScore(
  input: ProductTrustInput,
): ProductTrustScore {
  const quality = computeCardQualityScore({
    imageCount: input.imageCount,
    titleLength: input.title.length,
    hasCategory: input.hasCategory,
    hasProductType: input.hasProductType,
    characteristicCount: input.characteristicCount,
    requiredCharacteristicCount: input.requiredCharacteristicCount,
    filledRequiredCharacteristicCount: input.filledRequiredCharacteristicCount,
    descriptionLength: input.description?.length ?? 0,
    stock: input.stock,
    sellerVerified: input.sellerVerified,
    sellerBlocked: input.sellerBlocked,
    sellerCompletedOrders: input.sellerCompletedOrders,
  });

  const sellerComponent = (input.sellerTrustScore / 100) * 15;
  const stockComponent = input.stock > 0 ? 10 : 0;
  const priceComponent = input.price > 0 ? 5 : 0;

  const score = clampTrustScore(
    quality.score * 0.7 + sellerComponent + stockComponent + priceComponent,
  );

  const checklist: ProductTrustScore["checklist"] = [
    {
      ok: input.imageCount >= 1,
      label:
        input.imageCount >= 3
          ? "Реальные фотографии товара"
          : input.imageCount >= 1
            ? "Есть фотографии"
            : "Добавьте фотографии",
    },
    {
      ok:
        input.requiredCharacteristicCount === 0 ||
        input.filledRequiredCharacteristicCount >=
          input.requiredCharacteristicCount,
      label:
        input.filledRequiredCharacteristicCount > 0
          ? "Заполнены характеристики"
          : "Заполните характеристики",
    },
    {
      ok: (input.description?.length ?? 0) >= 20,
      label:
        (input.description?.length ?? 0) >= 20
          ? "Есть описание товара"
          : "Добавьте описание",
    },
    {
      ok: input.sellerVerified || input.sellerCompletedOrders >= 3,
      label: input.sellerVerified
        ? "Продавец проверен"
        : input.sellerCompletedOrders >= 3
          ? "Продавец с историей продаж"
          : "Продавец на площадке",
    },
    {
      ok: input.stock > 0,
      label: input.stock > 0 ? "Товар в наличии" : "Нет в наличии",
    },
  ];

  const reasons = checklist.filter((item) => item.ok).map((item) => item.label);

  return { score, reasons, checklist };
}

export function productTrustBullets(score: ProductTrustScore): string[] {
  if (score.reasons.length >= 2) return score.reasons.slice(0, 4);
  return score.checklist.filter((c) => c.ok).map((c) => `✓ ${c.label}`);
}
