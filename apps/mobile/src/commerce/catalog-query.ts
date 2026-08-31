import type { MobileProductListItem } from "../api/endpoints";
import { discountPercent } from "../utils/format";

export type CatalogQueryParams = {
  q: string;
  sort: string;
  categoryId?: string | null;
  sellerId?: string | null;
  inStockOnly: boolean;
  dealsOnly: boolean;
};

export type CatalogQueryKey = string;

export const DEALS_ONLY_POLICY = "CLIENT_SIDE_ONLY" as const;

export function buildCatalogQueryKey(params: CatalogQueryParams): CatalogQueryKey {
  return JSON.stringify({
    q: params.q.trim(),
    sort: params.sort,
    categoryId: params.categoryId ?? null,
    sellerId: params.sellerId ?? null,
    inStockOnly: params.inStockOnly,
    dealsOnly: params.dealsOnly,
  });
}

export function createRequestGeneration() {
  let generation = 0;
  return {
    next(): number {
      generation += 1;
      return generation;
    },
    current(): number {
      return generation;
    },
  };
}

export function isStaleCatalogRequest(requestGeneration: number, activeGeneration: number): boolean {
  return requestGeneration !== activeGeneration;
}

export function mergeCatalogProducts(
  previous: MobileProductListItem[],
  incoming: MobileProductListItem[],
  reset: boolean,
): MobileProductListItem[] {
  const base = reset ? [] : previous;
  const seen = new Set(base.map((item) => item.id));
  const merged = [...base];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

export function applyDealsOnlyFilter(items: MobileProductListItem[]): MobileProductListItem[] {
  return items.filter((item) => (discountPercent(item.price, item.compareAt) ?? 0) > 0);
}

export type CatalogPaginationTruth = {
  hasMore: boolean;
  nextCursor: string | null;
  countMode: "server" | "client_deals";
};

export function resolveCatalogPaginationTruth(
  dealsOnly: boolean,
  serverHasMore: boolean,
  serverNextCursor: string | null,
): CatalogPaginationTruth {
  if (!dealsOnly) {
    return {
      hasMore: serverHasMore,
      nextCursor: serverNextCursor,
      countMode: "server",
    };
  }
  return {
    hasMore: serverHasMore,
    nextCursor: serverNextCursor,
    countMode: "client_deals",
  };
}

export function formatCatalogProductCount(count: number, hasMore: boolean, countMode: CatalogPaginationTruth["countMode"]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = "товаров";
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) word = "товар";
    else if (mod10 >= 2 && mod10 <= 4) word = "товара";
  }

  if (countMode === "client_deals") {
    if (count === 0) return "Скидки на следующих страницах";
    if (hasMore) return `Показано ${count.toLocaleString("ru-RU")} ${word} со скидкой`;
    return `Найдено ${count.toLocaleString("ru-RU")} ${word} со скидкой`;
  }

  if (hasMore) return `Показано ${count.toLocaleString("ru-RU")}+ ${word}`;
  return `Найдено ${count.toLocaleString("ru-RU")} ${word}`;
}

export function canRequestCatalogPage(input: {
  reset: boolean;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  paginationInFlight: boolean;
  cursor: string | null;
  lastRequestedCursor: string | null;
  requestQueryKey: CatalogQueryKey;
  activeQueryKey: CatalogQueryKey;
}): boolean {
  if (input.requestQueryKey !== input.activeQueryKey) return false;
  if (input.reset) return true;
  if (input.loading || input.loadingMore || input.paginationInFlight) return false;
  if (!input.hasMore) return false;
  if (input.cursor !== null && input.cursor === input.lastRequestedCursor) return false;
  return true;
}
