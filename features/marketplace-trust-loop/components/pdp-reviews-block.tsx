import { Star } from "lucide-react";

import type { ProductRatingSnapshot, ReviewDto } from "@/lib/marketplace-trust-loop/reviews/types";

type PdpReviewsBlockProps = {
  rating: ProductRatingSnapshot | null;
  reviews: ReviewDto[];
};

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} из 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

export function PdpReviewsBlock({ rating, reviews }: PdpReviewsBlockProps) {
  if (!rating) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4" data-testid="pdp-reviews-block">
      <div className="flex flex-wrap items-center gap-3">
        <Stars value={rating.averageRating} />
        <p className="font-heading text-xl font-semibold">{rating.averageRating.toFixed(1)}</p>
        <p className="text-sm text-muted-foreground">{rating.reviewsCount} отзывов</p>
      </div>

      {reviews.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium">Последние отзывы</p>
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-center gap-2">
                <Stars value={review.rating} />
                <span className="text-muted-foreground">{review.buyerName ?? "Покупатель"}</span>
              </div>
              {review.text ? <p className="mt-2">{review.text}</p> : null}
              {review.pros ? (
                <p className="mt-1 text-muted-foreground">Плюсы: {review.pros}</p>
              ) : null}
              {review.cons ? (
                <p className="mt-1 text-muted-foreground">Минусы: {review.cons}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
