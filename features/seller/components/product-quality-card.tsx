import type { CompletenessResult } from "@/lib/conversion/completeness";
import { cn } from "@/lib/utils";

type ProductQualityCardProps = {
  result: CompletenessResult;
  compact?: boolean;
  showBreakdown?: boolean;
  showUpdateNote?: boolean;
  className?: string;
};

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 60) return "text-amber-700 dark:text-amber-400";
  return "text-destructive";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Отлично";
  if (score >= 60) return "Хорошо";
  return "Нужно улучшить";
}

/** Seller-facing listing quality — not used in ranking. */
export function ProductQualityCard({
  result,
  compact = false,
  showBreakdown = false,
  showUpdateNote = false,
  className,
}: ProductQualityCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/50 p-3 sm:p-4",
        className,
      )}
      data-testid="product-quality-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Рейтинг карточки</p>
          <p className="text-xs text-muted-foreground">{scoreLabel(result.score)}</p>
        </div>
        <p
          className={cn(
            "font-heading text-lg font-semibold tabular-nums",
            scoreTone(result.score),
          )}
          data-testid="product-quality-score"
        >
          {result.score}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </p>
      </div>

      {!compact || showBreakdown ? (
        <>
          <p className="mt-2 text-xs font-medium text-muted-foreground">Что влияет на рейтинг</p>
          <ul className="mt-2 space-y-1.5 text-sm" data-testid="product-quality-hints">
            {result.factors.map((f) => {
              const strong = f.ok && f.score >= f.max * 0.75;
              return (
                <li
                  key={f.key}
                  className={cn(
                    "flex justify-between gap-2",
                    strong ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  <span className="flex gap-2">
                    <span aria-hidden>{strong ? "✓" : "⚠"}</span>
                    <span>{f.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-xs">
                    {f.score}/{f.max}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : result.improvements.length > 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
          {result.improvements[0]}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">Карточка заполнена хорошо</p>
      )}
      {showUpdateNote ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Рейтинг обновляется сразу после сохранения карточки и при новых отзывах.
        </p>
      ) : null}
    </div>
  );
}
