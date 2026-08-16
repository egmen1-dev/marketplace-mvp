import type { ProductQualitySnapshotRow, QualityRecommendation } from "@/lib/marketplace-content-quality/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

type ContentQualityCardProps = {
  snapshot: ProductQualitySnapshotRow | null;
  pending?: boolean;
  compact?: boolean;
  className?: string;
};

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 60) return "text-amber-700 dark:text-amber-400";
  return "text-destructive";
}

function factorLabel(key: string): string {
  const map: Record<string, string> = {
    photo: "Фото",
    thumbnail: "Главное фото",
    description: "Описание",
    seo: "SEO",
    attributes: "Характеристики",
    video: "Видео",
    consistency: "Согласованность",
    commercialValue: "Полезность",
    buyerValue: "Ценность для покупателя",
  };
  return map[key] ?? key;
}

function NextActionBlock({ action }: { action: QualityRecommendation }) {
  return (
    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">Главное улучшение</p>
      <p className="mt-1 text-sm font-medium">{action.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{action.why}</p>
      {action.imageUrl ? (
        <img
          src={action.imageUrl}
          alt=""
          className="mt-2 h-16 w-16 rounded-md border object-cover"
        />
      ) : null}
      <Link
        href={action.ctaHref}
        className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
      >
        {action.ctaLabel}
      </Link>
    </div>
  );
}

/** Seller-facing Commercial Quality Score — separate from trust and ranking position. */
export function ContentQualityCard({
  snapshot,
  pending = false,
  compact = false,
  className,
}: ContentQualityCardProps) {
  if (pending && !snapshot) {
    return (
      <div
        className={cn("rounded-xl border border-border bg-card/50 p-4", className)}
        data-testid="content-quality-card"
      >
        <p className="text-sm font-medium">Качество карточки</p>
        <p className="mt-1 text-xs text-muted-foreground">Оценка качества обновляется</p>
      </div>
    );
  }

  if (!snapshot) return null;

  const score = snapshot.overallScore;
  const factors = Object.entries(snapshot.factorScores)
    .filter(([k]) => !["manipulation", "photoRelevance", "effectivePhotoCount"].includes(k))
    .slice(0, 8);

  const next = snapshot.recommendations[0];

  return (
    <div
      className={cn("rounded-xl border border-border bg-card/50 p-3 sm:p-4", className)}
      data-testid="content-quality-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Качество карточки</p>
          <p className="text-xs text-muted-foreground">
            Не путать с рейтингом доверия и оценкой позиции в выдаче
          </p>
        </div>
        <p
          className={cn("font-heading text-lg font-semibold tabular-nums", scoreTone(score))}
          data-testid="content-quality-score"
        >
          {score}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </p>
      </div>

      {!compact ? (
        <>
          {snapshot.strengths.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Что хорошо</p>
              <ul className="mt-1 space-y-1 text-sm" data-testid="content-quality-strengths">
                {snapshot.strengths.slice(0, 4).map((s) => (
                  <li key={s} className="flex gap-2">
                    <span aria-hidden>✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {snapshot.warnings.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Что мешает</p>
              <ul className="mt-1 space-y-1 text-sm" data-testid="content-quality-warnings">
                {snapshot.warnings.slice(0, 4).map((w) => (
                  <li key={w} className="flex gap-2 text-amber-800 dark:text-amber-300">
                    <span aria-hidden>⚠</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground">Факторы</p>
            <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {factors.map(([key, val]) => (
                <li key={key} className="flex justify-between gap-2">
                  <span>{factorLabel(key)}</span>
                  <span className="tabular-nums">{val}</span>
                </li>
              ))}
            </ul>
          </div>

          {next ? <NextActionBlock action={next} /> : null}

          <p className="mt-3 text-xs text-muted-foreground">
            <button type="button" className="underline-offset-2 hover:underline">
              Не согласен с оценкой
            </button>
          </p>
        </>
      ) : null}
    </div>
  );
}
