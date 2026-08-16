import type { MarketplaceBrainReport } from "@/lib/marketplace-cognitive-platform/brain/v1/types";
import { cn } from "@/lib/utils";

type CognitiveProductPreviewCardProps = {
  report: MarketplaceBrainReport;
  className?: string;
};

function scoreTone(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 60) return "text-amber-700 dark:text-amber-400";
  return "text-destructive";
}

/** Seller-facing compact advisory block — Wave 1 summary, no internal debug fields. */
export function CognitiveProductPreviewCard({
  report,
  className,
}: CognitiveProductPreviewCardProps) {
  const profileScore = report.genome.contextual.overall ?? report.genome.base.overall;
  const confidencePct = Math.round(report.confidence * 100);

  return (
    <div
      className={cn("rounded-xl border border-border bg-card/50 p-4", className)}
      data-testid="cognitive-product-preview"
    >
      <p className="text-sm font-medium">Интеллект карточки</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Экспериментальная функция. Не влияет напрямую на выдачу.
      </p>

      {report.summary.contextLabel ? (
        <p className="mt-2 text-xs text-muted-foreground">{report.summary.contextLabel}</p>
      ) : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Сейчас</p>
          <p className={cn("text-sm font-medium", scoreTone(profileScore))}>
            {report.summary.now}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Уверенность</p>
          <p className="text-2xl font-semibold tabular-nums">{confidencePct}%</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3">
        <p className="text-xs font-medium text-muted-foreground">Почему</p>
        <p className="mt-1 text-sm">{report.summary.why}</p>
      </div>

      {report.summary.nextStep ? (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Главный следующий шаг
          </p>
          <p className="mt-1 text-sm font-medium">{report.summary.nextStep}</p>
          {report.nextBestAction?.why ? (
            <p className="mt-1 text-xs text-muted-foreground">{report.nextBestAction.why}</p>
          ) : null}
        </div>
      ) : null}

      {report.summary.predictionHint ? (
        <div className="mt-3 rounded-lg border border-border/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">Что изменится</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.predictionHint}</p>
        </div>
      ) : null}

      {report.strengths.length > 0 ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Подробнее
          </summary>
          <ul className="mt-2 space-y-1">
            {report.strengths.slice(0, 2).map((s) => (
              <li key={s.label} className="text-emerald-700 dark:text-emerald-400">
                + {s.label}
              </li>
            ))}
            {report.weaknesses.slice(0, 2).map((w) => (
              <li key={w.label} className="text-destructive">
                − {w.label}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
