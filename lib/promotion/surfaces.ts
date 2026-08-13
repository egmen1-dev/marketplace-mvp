import { PromotionSurfaceType } from "@prisma/client";

/** Contract for future search integration — not consumed by ranking today. */
export type PromotionBoostSignal = {
  productId: string;
  boostWeight: number;
  reason: "PROMOTION";
};

export type PromotionSurfaceSpec = {
  surface: PromotionSurfaceType;
  position: number;
  priority: number;
};

/** Default placements created when a campaign becomes STARTED. */
export const DEFAULT_CAMPAIGN_PLACEMENTS: PromotionSurfaceSpec[] = [
  { surface: PromotionSurfaceType.HOME_FEATURED, position: 0, priority: 100 },
  { surface: PromotionSurfaceType.CATALOG_TOP, position: 0, priority: 90 },
  { surface: PromotionSurfaceType.CATEGORY_TOP, position: 0, priority: 80 },
  { surface: PromotionSurfaceType.SEARCH_BOOST, position: 0, priority: 70 },
];

export const PROMOTION_SURFACE_LABELS: Record<PromotionSurfaceType, string> = {
  [PromotionSurfaceType.HOME_FEATURED]: "Главная",
  [PromotionSurfaceType.CATALOG_TOP]: "Каталог",
  [PromotionSurfaceType.CATEGORY_TOP]: "Категория",
  [PromotionSurfaceType.SEARCH_BOOST]: "Поиск (подготовка)",
};

/** Surfaces visible to sellers in cabinet (excludes internal prep labels where needed). */
export const SELLER_SURFACE_LABELS: Record<PromotionSurfaceType, string> = {
  [PromotionSurfaceType.HOME_FEATURED]: "Главная — блок «Рекомендуем»",
  [PromotionSurfaceType.CATALOG_TOP]: "Каталог — верхний блок",
  [PromotionSurfaceType.CATEGORY_TOP]: "Страница категории",
  [PromotionSurfaceType.SEARCH_BOOST]: "Поиск — boost-сигнал (без изменения выдачи)",
};

export function promotionSurfaceRoute(surface: PromotionSurfaceType): string {
  return `/promotion-surface/${surface}`;
}

export function mapPriorityToBoostWeight(priority: number): number {
  return Math.max(1, Math.min(100, priority));
}

export { PromotionSurfaceType };
