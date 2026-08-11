import { pluralizeReviewWord } from "@/lib/i18n";
import type { ReviewSummary as ReviewSummaryData } from "@/features/reviews/queries";
import { ReviewStars } from "./review-stars";

/** Average + per-star distribution. Shows an empty state when there are 0 reviews. */
export function ReviewSummary({ summary }: { summary: ReviewSummaryData }) {
  if (summary.ratingCount === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="reviews-empty">
        У этого товара пока нет отзывов
      </p>
    );
  }

  const max = Math.max(1, summary.ratingCount);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex flex-col items-center gap-1">
        <span
          className="font-heading text-4xl font-semibold leading-none"
          data-testid="reviews-avg"
        >
          {summary.avgRating.toFixed(1)}
        </span>
        <ReviewStars value={summary.avgRating} size={18} />
        <span className="text-xs text-muted-foreground" data-testid="reviews-count">
          {summary.ratingCount} {pluralizeReviewWord(summary.ratingCount)}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count =
            summary.distribution[star as 1 | 2 | 3 | 4 | 5] ?? 0;
          const pct = Math.round((count / max) * 100);
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-right text-muted-foreground">{star}</span>
              <span className="text-amber-400">★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-8 text-right text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
