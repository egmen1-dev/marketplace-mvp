import { APP_NAME } from "@/lib/constants";

import type { ProductTrustExplanationLine, ProductTrustExplanationSnapshot } from "./types";

export function buildProductTrustExplanation(input: {
  imageCount: number;
  characteristicCount: number;
  reviewsCount: number;
  sellerTierLabel: string | null;
  sellerReliable: boolean;
}): ProductTrustExplanationSnapshot {
  const lines: ProductTrustExplanationLine[] = [];

  if (input.imageCount >= 3) {
    lines.push({
      id: "photos",
      text: `${input.imageCount} фотографий`,
      positive: true,
    });
  } else if (input.imageCount > 0) {
    lines.push({
      id: "photos",
      text: `Только ${input.imageCount} фото — добавьте больше для доверия`,
      positive: false,
    });
  }

  if (input.characteristicCount >= 5) {
    lines.push({ id: "specs", text: "подробные характеристики", positive: true });
  } else if (input.characteristicCount > 0) {
    lines.push({ id: "specs", text: "характеристики заполнены частично", positive: false });
  }

  if (input.reviewsCount >= 1) {
    lines.push({
      id: "reviews",
      text: `${input.reviewsCount} отзывов`,
      positive: true,
    });
  }

  if (input.sellerReliable && input.sellerTierLabel) {
    lines.push({
      id: "seller",
      text: input.sellerTierLabel.toLowerCase(),
      positive: true,
    });
  } else if (input.sellerTierLabel) {
    lines.push({
      id: "seller",
      text: input.sellerTierLabel.toLowerCase(),
      positive: input.sellerReliable,
    });
  }

  lines.push({
    id: "delivery",
    text: `доставка через ${APP_NAME}`,
    positive: true,
  });

  return {
    enabled: true,
    headline: "Почему этот товар вызывает доверие?",
    lines: lines.slice(0, 5),
  };
}
