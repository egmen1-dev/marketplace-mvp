import type { MobileProductListItem } from "../api/endpoints";

export const PDP_RELATED_QUERY_TYPE = "CATEGORY_POPULAR" as const;
export const PDP_RELATED_TITLE = "Популярное в категории" as const;
export const PDP_RELATED_LIMIT = 6;

export function filterRelatedProducts(
  items: MobileProductListItem[],
  currentProductId: string,
  limit = PDP_RELATED_LIMIT,
): MobileProductListItem[] {
  return items.filter((item) => item.id !== currentProductId).slice(0, limit);
}
