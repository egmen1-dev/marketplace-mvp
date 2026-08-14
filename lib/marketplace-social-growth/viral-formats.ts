import type { ProductListItem } from "@/features/products/types";
import { formatPrice } from "@/features/products/mappers";

import type { ViralContent, ViralFormatId } from "./types";

function impliedPrice(product: ProductListItem): number {
  if (product.compareAt != null && product.compareAt > product.price) {
    return product.compareAt;
  }
  return Math.round(product.price * 2.5);
}

export function buildViralFormat(
  formatId: ViralFormatId,
  product: ProductListItem,
  reasons: string[],
): Omit<ViralContent, "allowed" | "blockers"> {
  switch (formatId) {
    case "price-surprise":
      return {
        formatId,
        headline: "Выглядит на " + formatPrice(impliedPrice(product), product.currency),
        body: "А стоит:",
        bullets: [formatPrice(product.price, product.currency), ...reasons.slice(0, 2)],
        product,
      };
    case "daily-find":
      return {
        formatId,
        headline: "Сегодня нашли:",
        body: "Товар, который покупатели оценили выше всего",
        bullets: [product.title, ...reasons.slice(0, 2)],
        product,
      };
    case "before-after":
      return {
        formatId,
        headline: "До / После с этой находкой",
        body: "Полезно для дома, ремонта и обустройства",
        bullets: reasons.slice(0, 3),
        product,
      };
    case "why-buy":
    default:
      return {
        formatId: "why-buy",
        headline:
          product.favoritesCount >= 10
            ? `${product.favoritesCount} покупателей выбрали его потому что…`
            : "Почему покупатели выбирают:",
        body: product.title,
        bullets: reasons.slice(0, 4),
        product,
      };
  }
}

export const VIRAL_FORMAT_OPTIONS: Array<{ id: ViralFormatId; label: string }> = [
  { id: "price-surprise", label: "Цена удивляет" },
  { id: "daily-find", label: "Находка дня" },
  { id: "before-after", label: "До / После" },
  { id: "why-buy", label: "Почему покупают" },
];
