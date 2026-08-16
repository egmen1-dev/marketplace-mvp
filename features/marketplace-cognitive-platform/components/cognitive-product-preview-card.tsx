import type { CognitiveProductReport } from "@/lib/marketplace-cognitive-platform/brain/types";
import { cn } from "@/lib/utils";

type CognitiveProductPreviewCardProps = {
  report: CognitiveProductReport;
  className?: string;
};

function scoreTone(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 60) return "text-amber-700 dark:text-amber-400";
  return "text-destructive";
}

/** Seller-facing compact advisory block — no internal debug fields. */
export function CognitiveProductPreviewCard({
  report,
  className,
}: CognitiveProductPreviewCardProps) {
  const profileScore = report.genome.overall;
  const confidencePct = Math.round(report.genome.confidence * 100);
  const mainIssue =
    report.nextStep ??
    report.explanation.factorDeltas.find((d) => d.delta < 0)?.label ??
    null;

  return (
    <div
      className={cn("rounded-xl border border-border bg-card/50 p-4", className)}
      data-testid="cognitive-product-preview"
    >
      <p className="text-sm font-medium">Интеллект карточки</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Экспериментальная функция. Не влияет напрямую на выдачу.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Профиль карточки</p>
          <p className={cn("text-2xl font-semibold tabular-nums", scoreTone(profileScore))}>
            {profileScore != null ? `${profileScore}/100` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Уверенность</p>
          <p className="text-2xl font-semibold tabular-nums">{confidencePct}%</p>
        </div>
      </div>

      {report.strengths.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Сильные стороны</p>
          <ul className="mt-1 space-y-1 text-sm">
            {report.strengths.slice(0, 3).map((s) => (
              <li key={s}>✓ {s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {mainIssue ? (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {report.nextStep ? "Следующий шаг" : "Главная проблема"}
          </p>
          <p className="mt-1 text-sm">⚠ {mainIssue}</p>
        </div>
      ) : null}
    </div>
  );
}
