"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { categoryLabel } from "@/lib/seller-growth/insights";
import type { SellerGrowthDashboard } from "@/lib/seller-growth/types";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type SellerGrowthDashboardPanelProps = {
  data: SellerGrowthDashboard;
};

function levelBadgeClass(level: SellerGrowthDashboard["score"]["level"]) {
  if (level === "STRONG") return "bg-primary text-primary-foreground";
  if (level === "GROWING") return "bg-secondary text-secondary-foreground";
  return "bg-destructive/15 text-destructive";
}

export function SellerGrowthDashboardPanel({
  data,
}: SellerGrowthDashboardPanelProps) {
  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_GROWTH_VIEW,
      route: ROUTES.ACCOUNT_GROWTH,
    });
  }, []);

  const groupedInsights = data.insights.reduce<
    Record<string, typeof data.insights>
  >((acc, item) => {
    const key = categoryLabel(item.type);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  function onInsightClick(productId?: string) {
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_INSIGHT_VIEW,
      route: ROUTES.ACCOUNT_GROWTH,
      entityId: productId,
    });
  }

  function onActionClick(action: (typeof data.actions)[0]) {
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_ACTION_CLICK,
      route: ROUTES.ACCOUNT_GROWTH,
      entityId: action.productId,
    });
  }

  function onActionComplete(action: (typeof data.actions)[0]) {
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_ACTION_COMPLETE,
      route: ROUTES.ACCOUNT_GROWTH,
      entityId: action.productId,
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-growth-dashboard">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Мой уровень</p>
            <p
              className="mt-1 font-heading text-4xl font-semibold tabular-nums"
              data-testid="seller-growth-score"
            >
              {data.score.score}/100
            </p>
            <p className="mt-2 text-sm">{data.score.levelLabel}</p>
          </div>
          <Badge className={cn("rounded-lg px-3 py-1", levelBadgeClass(data.score.level))}>
            {data.score.level}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.score.strengths.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Сильные стороны</p>
              <ul className="mt-1 list-inside list-disc text-sm">
                {data.score.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.score.weaknesses.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Зоны роста</p>
              <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                {data.score.weaknesses.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-medium">Что улучшить</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(groupedInsights)
            .slice(0, 6)
            .map(([category, items]) => (
              <div
                key={category}
                className="rounded-xl border border-border/60 bg-muted/20 p-3"
                data-testid={`seller-growth-insight-group-${category}`}
              >
                <p className="text-sm font-medium">{category}</p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {items.slice(0, 2).map((item) => (
                    <li
                      key={`${item.type}-${item.productId ?? item.title}`}
                      onMouseEnter={() => onInsightClick(item.productId)}
                    >
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-xs">{item.action}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-medium">Возможности</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {data.opportunities.readyForPromotionCount > 0 ? (
            <li data-testid="seller-growth-opportunity-promotion">
              {data.opportunities.readyForPromotionCount} товар(ов) готовы к
              продвижению
            </li>
          ) : null}
          {data.opportunities.needsImprovementCount > 0 ? (
            <li data-testid="seller-growth-opportunity-improve">
              {data.opportunities.needsImprovementCount} товар(ов) требуют
              улучшения
            </li>
          ) : null}
          {data.opportunities.lowStockCount > 0 ? (
            <li>
              {data.opportunities.lowStockCount} товар(ов) с низким остатком
            </li>
          ) : null}
        </ul>
      </section>

      {data.nextAction ? (
        <section
          className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
          data-testid="seller-growth-next-action"
        >
          <div className="flex items-start gap-3">
            <TrendingUp className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Следующий шаг</p>
              <p className="mt-1 font-heading text-base">{data.nextAction.action}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.nextAction.impact}
                {data.nextAction.target ? ` · ${data.nextAction.target}` : ""}
              </p>
              {data.nextAction.href ? (
                <Link
                  href={data.nextAction.href}
                  className="mt-3 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    onActionClick(data.nextAction!);
                    onActionComplete(data.nextAction!);
                  }}
                >
                  Выполнить
                  <ArrowRight className="ml-1 size-4" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {data.actions.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <h2 className="font-heading text-lg font-medium">AI Actions</h2>
          </div>
          <ul className="space-y-2">
            {data.actions.slice(0, 6).map((item) => (
              <li
                key={`${item.type}-${item.productId ?? item.action}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                data-testid={`seller-growth-action-${item.type}-${item.productId ?? "global"}`}
              >
                <div>
                  <Badge variant="outline" className="mr-2 text-xs">
                    {item.priority}
                  </Badge>
                  <span className="font-medium">{item.action}</span>
                  <span className="ml-2 text-muted-foreground">{item.impact}</span>
                </div>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-primary hover:underline"
                    onClick={() => {
                      onActionClick(item);
                    }}
                  >
                    Перейти
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
