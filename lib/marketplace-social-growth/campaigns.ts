import type { ProductListItem } from "@/features/products/types";

import type { ViralFormatId } from "./types";

export type GrowthOpportunity = {
  productId: string;
  title: string;
  reason: string;
};

export function detectGrowthOpportunities(
  products: Array<{
    product: ProductListItem;
    discoveryScore: number;
    socialViews: number;
  }>,
): GrowthOpportunity[] {
  return products
    .filter((p) => p.discoveryScore >= 60 && p.socialViews < 5)
    .slice(0, 5)
    .map((p) => ({
      productId: p.product.id,
      title: p.product.title,
      reason:
        "Товар имеет высокий Discovery Score, но мало социальных показов — рекомендуется создать контент.",
    }));
}

export const SELLER_CONTENT_OPTIONS: Array<{ id: string; label: string; formatId: ViralFormatId }> = [
  { id: "story", label: "История находки", formatId: "daily-find" },
  { id: "card", label: "Карточка для соцсетей", formatId: "why-buy" },
  { id: "why", label: "Почему покупают", formatId: "why-buy" },
  { id: "gift", label: "Подарочная подборка", formatId: "price-surprise" },
];
