import type { ProductListResult } from "@/features/products/types";

export type MobilePaginationEnvelope<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function toMobilePagination<T>(
  result: ProductListResult,
): MobilePaginationEnvelope<T> {
  const hasMore = result.page < result.totalPages;
  return {
    items: result.items as T[],
    nextCursor: hasMore ? `page:${result.page + 1}` : null,
    hasMore,
  };
}

export function parseMobilePageCursor(cursor?: string | null): number {
  if (!cursor) return 1;
  const match = cursor.match(/^page:(\d+)$/);
  return match ? Number(match[1]) : 1;
}
