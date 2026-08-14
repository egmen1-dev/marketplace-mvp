import type { SellerTrustScoreSnapshot } from "@/lib/marketplace-trust-score/types";

type SellerTrustScorePanelProps = {
  snapshot: SellerTrustScoreSnapshot;
};

export function SellerTrustScorePanel({ snapshot }: SellerTrustScorePanelProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="seller-trust-score-panel">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{snapshot.trustScoreLabel}</p>
        <p className="font-heading text-3xl font-semibold">{snapshot.trustScore}/100</p>
        <p className="mt-1 text-sm font-medium">{snapshot.trustLevel}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {snapshot.reviewsCount} отзывов · {snapshot.completedOrders} заказов
        </p>
      </div>

      {snapshot.helps.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">Что помогает</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {snapshot.helps.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {snapshot.hurts.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">Что снижает</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {snapshot.hurts.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {snapshot.nextImprovement ? (
        <div
          className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm"
          data-testid="seller-trust-next-improvement"
        >
          <p className="font-medium">Следующее улучшение</p>
          <p className="mt-1 text-muted-foreground">{snapshot.nextImprovement}</p>
        </div>
      ) : null}

      {snapshot.verificationDetails.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">Данные продавца подтверждены</p>
          <p className="mt-1 text-xs text-muted-foreground">Проверено:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {snapshot.verificationDetails.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {snapshot.history.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">История изменений</p>
          <ul className="mt-3 space-y-3">
            {snapshot.history.map((entry) => (
              <li key={entry.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <p className="font-medium">
                  {entry.oldScore} → {entry.newScore}
                </p>
                <p className="mt-1 text-muted-foreground">{entry.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Изменение: {entry.delta > 0 ? `+${entry.delta}` : entry.delta} балла
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
