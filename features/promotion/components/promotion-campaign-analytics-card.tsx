"use client";

import { useEffect } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { formatPrice } from "@/features/products/mappers";
import type { PromotionPerformanceSummary } from "@/lib/promotion/analytics/types";
import { ROUTES } from "@/lib/constants";

type PromotionCampaignAnalyticsCardProps = {
  productId: string;
  currency: string;
  performance: PromotionPerformanceSummary;
};

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Seller campaign performance — advisory metrics only. */
export function PromotionCampaignAnalyticsCard({
  productId,
  currency,
  performance,
}: PromotionCampaignAnalyticsCardProps) {
  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.PROMOTION_CAMPAIGN_VIEW,
      route: ROUTES.ACCOUNT_PROMOTIONS,
      entityId: productId,
    });
    trackEvent({
      event: ANALYTICS_EVENTS.PROMOTION_ROI_VIEW,
      route: ROUTES.ACCOUNT_PROMOTIONS,
      entityId: productId,
    });
  }, [productId]);

  return (
    <div
      className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm"
      data-testid={`promotion-analytics-${productId}`}
    >
      <p className="font-medium">Эффективность продвижения</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground sm:grid-cols-3">
        <div>
          <dt>Показы</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {performance.impressions}
          </dd>
        </div>
        <div>
          <dt>Клики</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {performance.clicks}
          </dd>
        </div>
        <div>
          <dt>CTR</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {formatPercent(performance.ctr)}
          </dd>
        </div>
        <div>
          <dt>Просмотры товара</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {performance.productViews}
          </dd>
        </div>
        <div>
          <dt>В корзину</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {performance.addToCart}
          </dd>
        </div>
        <div>
          <dt>Заказы</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {performance.orders}
          </dd>
        </div>
      </dl>
      <p className="mt-3 font-medium text-foreground">
        Выручка: {formatPrice(performance.revenue, currency)}
      </p>
      {performance.promotionCost > 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Стоимость продвижения:{" "}
          {formatPrice(performance.promotionCost, currency)} · Прибыль:{" "}
          {formatPrice(performance.profit, currency)}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        Оценка эффективности: {performance.performanceScore}/100 (не влияет на
        выдачу)
      </p>
      <p
        className="mt-2 text-xs text-muted-foreground"
        data-testid={`promotion-roi-${productId}`}
      >
        {performance.roiLabel}
      </p>
    </div>
  );
}
