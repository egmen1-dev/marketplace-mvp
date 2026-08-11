"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ReviewCardDto, ReviewSummary as ReviewSummaryData } from "@/features/reviews/queries";
import type { ReviewSort } from "@/features/reviews/schemas";
import { ReviewCard } from "./review-card";
import { ReviewSummary } from "./review-summary";

type Props = {
  productId: string;
  summary: ReviewSummaryData;
  initialItems: ReviewCardDto[];
  total: number;
  pageSize: number;
};

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: "Сначала новые" },
  { value: "highest", label: "Высокая оценка" },
  { value: "lowest", label: "Низкая оценка" },
];

/** PDP reviews block: summary + sortable, paginated list (SSR first chunk). */
export function ProductReviews({
  productId,
  summary,
  initialItems,
  total,
  pageSize,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [loading, setLoading] = useState(false);

  const fetchPage = useCallback(
    async (nextSort: ReviewSort, nextPage: number, replace: boolean) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/reviews?productId=${encodeURIComponent(productId)}&sort=${nextSort}&page=${nextPage}&pageSize=${pageSize}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { items: ReviewCardDto[] };
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setPage(nextPage);
      } finally {
        setLoading(false);
      }
    },
    [productId, pageSize],
  );

  const onSortChange = (value: ReviewSort) => {
    setSort(value);
    void fetchPage(value, 1, true);
  };

  const hasMore = items.length < total;

  return (
    <section className="flex flex-col gap-5" id="reviews" data-testid="pdp-reviews">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">Отзывы</h2>
        {summary.ratingCount > 0 ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Сортировка
            <select
              className="h-9 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground"
              value={sort}
              data-testid="reviews-sort"
              onChange={(e) => onSortChange(e.target.value as ReviewSort)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <ReviewSummary summary={summary} />

      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      ) : null}

      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          disabled={loading}
          data-testid="reviews-load-more"
          onClick={() => void fetchPage(sort, page + 1, false)}
        >
          {loading ? "Загружаем…" : "Показать ещё"}
        </Button>
      ) : null}
    </section>
  );
}
