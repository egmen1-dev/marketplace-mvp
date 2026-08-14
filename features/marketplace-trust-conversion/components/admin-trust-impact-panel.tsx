import type { TrustImpactSnapshot } from "@/lib/marketplace-trust-conversion/types";

type AdminTrustImpactPanelProps = {
  impact: TrustImpactSnapshot;
};

function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${rate}%`;
}

export function AdminTrustImpactPanel({ impact }: AdminTrustImpactPanelProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      data-testid="admin-trust-impact"
    >
      <h3 className="font-heading text-lg font-semibold">Влияние доверия на покупки</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Сравнение конверсии за {impact.windowDays} дн. · без изменения ranking
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">Товары с Trust Block</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {formatRate(impact.withTrustBlock.viewToCartRate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Конверсия в корзину</p>
          <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>Просмотры с trust</dt>
              <dd className="font-medium text-foreground">{impact.withTrustBlock.views}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Корзина</dt>
              <dd className="font-medium text-foreground">{impact.withTrustBlock.cartAdds}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Покупки</dt>
              <dd className="font-medium text-foreground">{impact.withTrustBlock.purchases}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium">Товары без Trust Block</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {formatRate(impact.withoutTrustBlock.viewToCartRate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Конверсия в корзину</p>
          <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>Просмотры без trust</dt>
              <dd className="font-medium text-foreground">{impact.withoutTrustBlock.views}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Корзина</dt>
              <dd className="font-medium text-foreground">{impact.withoutTrustBlock.cartAdds}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Покупки</dt>
              <dd className="font-medium text-foreground">{impact.withoutTrustBlock.purchases}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
