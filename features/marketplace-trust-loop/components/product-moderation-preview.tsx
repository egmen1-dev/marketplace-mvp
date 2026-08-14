import type { ModerationIssue } from "@/lib/marketplace-trust-loop/reviews/types";

type AiModerationAdvice = {
  headline: string;
  bullets: string[];
  recommendation: string;
};

type ProductModerationPreviewProps = {
  qualityScore: number;
  issues: ModerationIssue[];
  aiAdvice?: AiModerationAdvice | null;
};

export function ProductModerationPreview({
  qualityScore,
  issues,
  aiAdvice,
}: ProductModerationPreviewProps) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="product-moderation-preview"
    >
      <h2 className="font-medium">Ваш товар проверяется</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Качество карточки: {qualityScore}/100
      </p>
      {issues.length > 0 ? (
        <div className="mt-4 space-y-2 text-sm">
          <p className="font-medium">Что нужно улучшить</p>
          <ul className="space-y-2 text-muted-foreground">
            {issues.slice(0, 6).map((issue) => (
              <li key={issue.id}>
                {issue.severity === "error" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️"}{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Карточка готова к отправке на модерацию.
        </p>
      )}
      {aiAdvice ? (
        <div className="mt-4 rounded-xl bg-surface/60 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{aiAdvice.headline}</p>
          <ul className="mt-2 space-y-1">
            {aiAdvice.bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-2">{aiAdvice.recommendation}</p>
        </div>
      ) : null}
    </div>
  );
}
