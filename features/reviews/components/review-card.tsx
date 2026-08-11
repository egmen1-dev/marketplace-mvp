import { BadgeCheck } from "lucide-react";

import type { ReviewCardDto } from "@/features/reviews/queries";
import { ReviewStars } from "./review-stars";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Presentational review card. Text is rendered as plain React children (escaped)
 * — never dangerouslySetInnerHTML (section 5). No email / PII is shown.
 */
export function ReviewCard({ review }: { review: ReviewCardDto }) {
  return (
    <article
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface/40 p-4"
      data-testid="review-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-sm font-medium">{review.authorName}</span>
        <span
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
          data-testid="verified-purchase-badge"
        >
          <BadgeCheck className="size-3.5" aria-hidden />
          Покупка подтверждена
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDate(review.createdAt)}
          {review.editedAt ? " · изменён" : ""}
        </span>
      </div>

      <ReviewStars value={review.rating} />

      {review.title ? (
        <h4 className="font-heading text-sm font-semibold">{review.title}</h4>
      ) : null}
      {review.text ? (
        <p className="text-sm whitespace-pre-line text-foreground/90">{review.text}</p>
      ) : null}

      {review.sellerReply ? (
        <div className="mt-2 rounded-xl border border-border bg-background/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">Ответ продавца</p>
          <p className="mt-1 text-sm whitespace-pre-line">{review.sellerReply}</p>
        </div>
      ) : null}
    </article>
  );
}
