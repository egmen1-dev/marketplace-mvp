"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Megaphone,
  Pause,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductImage } from "@/features/products/components/product-image";
import { formatPrice } from "@/features/products/mappers";
import {
  endPromotionAction,
  pausePromotionAction,
  purchasePromotionAction,
  startPromotionAction,
} from "@/features/promotion/actions";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";
import {
  formatCtrDisplay,
  formatRoiDisplay,
} from "@/lib/seller-promotion-center/performance";
import type { SellerPromotionCenterDashboard } from "@/lib/seller-promotion-center/types";
import type { PromotionPlanDto } from "@/lib/promotion/billing/types";

type SellerPromotionCenterPanelProps = {
  data: SellerPromotionCenterDashboard;
};

export function SellerPromotionCenterPanel({
  data,
}: SellerPromotionCenterPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.PROMOTION_CENTER_VIEW,
      route: ROUTES.ACCOUNT_PROMOTION_CENTER,
    });
    if (data.opportunities.length > 0) {
      trackEvent({
        event: ANALYTICS_EVENTS.PROMOTION_PRODUCT_RECOMMENDATION_VIEW,
        route: ROUTES.ACCOUNT_PROMOTION_CENTER,
      });
    }
    if (data.budgetRecommendation) {
      trackEvent({
        event: ANALYTICS_EVENTS.PROMOTION_BUDGET_RECOMMENDATION_VIEW,
        route: ROUTES.ACCOUNT_PROMOTION_CENTER,
      });
    }
  }, [data.enabled, data.opportunities.length, data.budgetRecommendation]);

  if (!data.enabled) {
    return (
      <Card data-testid="seller-promotion-center-panel">
        <CardHeader>
          <CardTitle>{data.title}</CardTitle>
          <CardDescription>SELLER_PROMOTION_CENTER_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function planIdFor(planName: string | null) {
    if (!planName) return null;
    return data.plans.find((p) => p.name === planName)?.id ?? null;
  }

  function launchPromotion(
    productId: string,
    planCode: "BOOST" | "GROWTH" | "STARTER" | null,
  ) {
    startTransition(async () => {
      trackEvent({
        event: ANALYTICS_EVENTS.PROMOTION_RECOMMENDATION_CLICK,
        route: ROUTES.ACCOUNT_PROMOTION_CENTER,
        entityId: productId,
      });
      let result;
      if (data.billingEnabled && planCode) {
        const planId = planIdFor(planCode);
        if (!planId) {
          window.alert("Тариф не найден");
          return;
        }
        result = await purchasePromotionAction(productId, planId);
      } else {
        result = await startPromotionAction(productId);
      }
      if (!result.ok) {
        if (result.error) window.alert(result.error);
        return;
      }
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      router.refresh();
    });
  }

  function runCampaignAction(
    action: (id: string) => Promise<{ ok: boolean; error?: string; checkoutUrl?: string }>,
    productId: string,
  ) {
    startTransition(async () => {
      trackEvent({
        event: ANALYTICS_EVENTS.PROMOTION_CAMPAIGN_OPEN,
        route: ROUTES.ACCOUNT_PROMOTION_CENTER,
        entityId: productId,
      });
      const result = await action(productId);
      if (!result.ok && result.error) window.alert(result.error);
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-promotion-center-panel">
      <section data-testid="promotion-summary-cards">
        <h2 className="mb-3 font-heading text-lg font-semibold">
          {data.summary.periodLabel}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <SummaryCard label="Активные кампании" value={String(data.summary.activeCampaigns)} />
          <SummaryCard label="Расходы" value={formatPrice(data.summary.spend, "RUB")} />
          <SummaryCard label="Показы" value={String(data.summary.impressions)} />
          <SummaryCard label="Переходы" value={String(data.summary.clicks)} />
          <SummaryCard label="Заказы" value={String(data.summary.orders)} />
          <SummaryCard label="Выручка" value={formatPrice(data.summary.revenue, "RUB")} />
          <SummaryCard label="ROI" value={data.summary.roiLabel} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Потрачено: {formatPrice(data.summary.spend, "RUB")} · Получено заказов:{" "}
          {data.summary.orders} · Выручка:{" "}
          {formatPrice(data.summary.revenue, "RUB")}
        </p>
      </section>

      {data.opportunities.length > 0 ? (
        <section data-testid="promotion-opportunities">
          <h2 className="mb-3 font-heading text-lg font-semibold">
            Какие товары стоит продвигать
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.opportunities.map((opp) => (
              <Card key={opp.productId}>
                <CardHeader className="flex flex-row gap-3 pb-2">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage
                      src={opp.imageUrl}
                      alt={opp.title}
                      sizes="64px"
                      containerClassName="aspect-square"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{opp.title}</CardTitle>
                    <CardDescription>
                      {formatPrice(opp.price, opp.currency)} · Quality{" "}
                      {opp.qualityScore}/100
                    </CardDescription>
                    <p className="mt-1 text-sm font-medium text-primary">
                      Шанс роста: {opp.promotionScore}/100
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="font-medium">Почему:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {opp.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    disabled={pending || !opp.ready}
                    onClick={() => launchPromotion(opp.productId, opp.recommendedPlan)}
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      "Запустить продвижение"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {data.budgetRecommendation ? (
        <section data-testid="promotion-budget-assistant">
          <h2 className="mb-3 font-heading text-lg font-semibold">
            Рекомендация бюджета
          </h2>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {data.budgetRecommendation.productTitle}
              </CardTitle>
              <CardDescription>
                {data.budgetRecommendation.views} просмотров ·{" "}
                {data.budgetRecommendation.orders} заказов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">
                Рекомендуемый бюджет:{" "}
                {formatPrice(data.budgetRecommendation.recommendedAmount, "RUB")} /{" "}
                {data.budgetRecommendation.durationDays} дней
              </p>
              <p className="text-muted-foreground">{data.budgetRecommendation.why}</p>
              <p className="text-xs text-muted-foreground">
                {data.budgetRecommendation.disclaimer}
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {data.campaigns.length > 0 ? (
        <section data-testid="promotion-campaigns">
          <h2 className="mb-3 font-heading text-lg font-semibold">
            Управление кампаниями
          </h2>
          <div className="space-y-4">
            {data.campaigns.map((campaign) => (
              <Card key={campaign.campaignId} data-testid={`campaign-${campaign.productId}`}>
                <CardHeader className="flex flex-row items-start gap-3 pb-2">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage
                      src={campaign.imageUrl}
                      alt={campaign.productTitle}
                      sizes="56px"
                      containerClassName="aspect-square"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{campaign.productTitle}</CardTitle>
                    <CardDescription>
                      {campaign.statusLabel}
                      {campaign.periodLabel ? ` · ${campaign.periodLabel}` : ""}
                      {campaign.budget != null
                        ? ` · ${formatPrice(campaign.budget, "RUB")}`
                        : ""}
                    </CardDescription>
                  </div>
                  <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>
                    {campaign.statusLabel}
                  </Badge>
                </CardHeader>
                {campaign.performance ? (
                  <CardContent className="grid gap-2 text-sm sm:grid-cols-4 lg:grid-cols-8">
                    <Metric label="Показы" value={campaign.performance.impressions} />
                    <Metric label="Клики" value={campaign.performance.clicks} />
                    <Metric label="CTR" value={formatCtrDisplay(campaign.performance.ctr)} />
                    <Metric label="Корзины" value={campaign.performance.addToCart} />
                    <Metric label="Заказы" value={campaign.performance.orders} />
                    <Metric
                      label="Выручка"
                      value={formatPrice(campaign.performance.revenue, "RUB")}
                    />
                    <Metric
                      label="ROI"
                      value={formatRoiDisplay(campaign.performance.roiPercent)}
                    />
                  </CardContent>
                ) : null}
                <CardContent className="flex flex-wrap gap-2 pt-0">
                  {campaign.status === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => runCampaignAction(pausePromotionAction, campaign.productId)}
                    >
                      <Pause className="mr-1 size-4" aria-hidden />
                      Пауза
                    </Button>
                  ) : null}
                  {data.billingEnabled && data.plans[0] ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        runCampaignAction(async (id) => {
                          const planId = data.plans[0]?.id;
                          if (!planId) return { ok: false, error: "Нет тарифа" };
                          return purchasePromotionAction(id, planId);
                        }, campaign.productId)
                      }
                    >
                      Изменить тариф
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => runCampaignAction(endPromotionAction, campaign.productId)}
                  >
                    Остановить
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section data-testid="promotion-analytics-detail">
        <h2 className="mb-3 font-heading text-lg font-semibold">Аналитика</h2>
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Показы" value={data.analytics.metrics.impressions} />
            <Metric label="Клики" value={data.analytics.metrics.clicks} />
            <Metric label="CTR" value={formatCtrDisplay(data.analytics.metrics.ctr)} />
            <Metric
              label="Конверсия"
              value={`${(Math.round(data.analytics.metrics.conversionRate * 10) / 10).toFixed(1)}%`}
            />
            <Metric label="Заказы" value={data.analytics.metrics.orders} />
          </CardContent>
          <CardContent>
            <p className="mb-2 text-sm font-medium">Воронка</p>
            <div className="flex flex-wrap items-end gap-2">
              {data.analytics.funnel.map((step, index) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted px-3 py-2 text-center text-sm">
                    <p className="font-medium">{step.value}</p>
                    <p className="text-xs text-muted-foreground">{step.label}</p>
                  </div>
                  {index < data.analytics.funnel.length - 1 ? (
                    <span className="text-muted-foreground">↓</span>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {data.aiAdvice.length > 0 ? (
        <section data-testid="promotion-ai-coach">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <h2 className="font-heading text-lg font-semibold">AI советует</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.aiAdvice.map((advice) => (
              <Card key={advice.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{advice.headline}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Причина: </span>
                    {advice.reason}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Действие: </span>
                    {advice.action}
                  </p>
                  <Button
                    size="sm"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() =>
                      trackEvent({
                        event: ANALYTICS_EVENTS.PROMOTION_AI_ADVICE_CLICK,
                        route: ROUTES.ACCOUNT_PROMOTION_CENTER,
                        entityId: advice.id,
                      })
                    }
                    nativeButton={false}
                    render={<Link href={ROUTES.ACCOUNT_PRODUCTS} />}
                  >
                    Перейти к товарам
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {data.comparison.length > 0 ? (
        <section data-testid="promotion-comparison">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" aria-hidden />
            <h2 className="font-heading text-lg font-semibold">Что работает лучше</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.comparison.map((row) => (
              <Card key={row.productId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{row.productTitle}</CardTitle>
                  <CardDescription>
                    CTR {formatCtrDisplay(row.ctr)} · {row.roiLabel}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-lg tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}
