"use client";

import type { AdminSellerGrowthOverview } from "@/lib/seller-growth/types";

type AdminSellerGrowthPanelProps = {
  overview: AdminSellerGrowthOverview;
};

export function AdminSellerGrowthPanel({
  overview,
}: AdminSellerGrowthPanelProps) {
  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      data-testid="admin-seller-growth-overview"
    >
      <h3 className="font-heading text-base font-medium">
        Seller Growth Overview
      </h3>

      <ul className="space-y-1 text-sm text-muted-foreground">
        {overview.headlines.map((line) => (
          <li key={line} data-testid="admin-seller-growth-headline">
            {line}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Без продвижения</p>
          <p
            className="font-heading text-xl tabular-nums"
            data-testid="admin-seller-growth-unpromoted"
          >
            {overview.sellersWithUnpromotedReadyProducts}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">1 товар</p>
          <p className="font-heading text-xl tabular-nums">
            {overview.singleProductSellers}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Высокий потенциал</p>
          <p className="font-heading text-xl tabular-nums">
            {overview.highPotentialProducts}
          </p>
        </div>
      </div>

      {overview.topSellers.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">Лучшие продавцы</p>
          <ul className="space-y-1 text-sm">
            {overview.topSellers.map((s) => (
              <li key={s.sellerId} data-testid={`admin-top-seller-${s.sellerId}`}>
                {s.storeName} — {s.score}/100 ({s.level})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {overview.atRiskSellers.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">Продавцы с риском ухода</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {overview.atRiskSellers.map((s) => (
              <li key={s.sellerId}>
                {s.storeName} — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {overview.inactiveSellers.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">Без активности</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {overview.inactiveSellers.map((s) => (
              <li key={s.sellerId}>
                {s.storeName} — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
