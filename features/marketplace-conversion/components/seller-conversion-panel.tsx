"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  trackConversionActionClick,
  trackSellerConversionView,
} from "@/lib/marketplace-conversion/analytics";
import type { SellerConversionDashboard } from "@/lib/marketplace-conversion/seller-conversion";

import { ConversionRecommendationCard } from "./conversion-recommendation-card";

type SellerConversionPanelProps = {
  dashboard: SellerConversionDashboard;
  sellerProfileId: string;
};

export function SellerConversionPanel({
  dashboard,
  sellerProfileId,
}: SellerConversionPanelProps) {
  useEffect(() => {
    if (dashboard.enabled) trackSellerConversionView(sellerProfileId);
  }, [dashboard.enabled, sellerProfileId]);

  if (!dashboard.enabled) return null;

  return (
    <div className="flex flex-col gap-4" data-testid="seller-conversion-panel">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Конверсия магазина</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/80 bg-surface/40 p-3">
            <p className="text-sm text-muted-foreground">Просмотры</p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {dashboard.views}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-surface/40 p-3">
            <p className="text-sm text-muted-foreground">Добавления в корзину</p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {dashboard.cartAdds}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-surface/40 p-3">
            <p className="text-sm text-muted-foreground">Заказы</p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {dashboard.orders}
            </p>
          </div>
        </div>
        {dashboard.viewToCartRate != null ? (
          <p className="mt-3 text-sm text-muted-foreground">
            View → cart: {dashboard.viewToCartRate}%
          </p>
        ) : null}
      </div>

      {dashboard.blockers.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="font-medium">Что мешает продавать</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {dashboard.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {dashboard.recommendations.map((r) => (
        <ConversionRecommendationCard key={r.id} recommendation={r} />
      ))}

      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          <Link
            href="/account/promotion-center"
            onClick={() => trackConversionActionClick("seller-promotion-link")}
          />
        }
      >
        Promotion Center →
      </Button>
    </div>
  );
}
