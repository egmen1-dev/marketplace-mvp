import type { SellerReputationSnapshot } from "@/lib/marketplace-trust-loop/reviews/types";

type SellerReputationPanelProps = {
  reputation: SellerReputationSnapshot;
};

export function SellerReputationPanel({ reputation }: SellerReputationPanelProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="seller-reputation-panel">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Рейтинг</p>
        <p className="font-heading text-3xl font-semibold">
          {reputation.averageRating.toFixed(1)} ⭐
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {reputation.reviewsCount} отзывов
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-medium">{reputation.trustLabel}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {reputation.trustScore}/100
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="font-medium">Что покупатели любят</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {reputation.strengths.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="font-medium">Что улучшить</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {reputation.improvements.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
