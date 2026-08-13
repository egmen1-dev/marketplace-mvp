"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Brain, Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/features/products/mappers";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import type { MarketplaceIntelligenceDashboard } from "@/lib/marketplace-intelligence/types";

type AdminMarketplaceIntelligencePanelProps = {
  data: MarketplaceIntelligenceDashboard;
};

function impactBadge(impact: string) {
  if (impact === "HIGH") return "destructive";
  if (impact === "MEDIUM") return "secondary";
  return "outline";
}

export function AdminMarketplaceIntelligencePanel({
  data,
}: AdminMarketplaceIntelligencePanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.INTELLIGENCE_VIEW,
      route: ROUTES.ADMIN_INTELLIGENCE,
    });
    if (data.opportunities.length > 0) {
      trackEvent({
        event: ANALYTICS_EVENTS.OPPORTUNITY_VIEW,
        route: ROUTES.ADMIN_INTELLIGENCE,
      });
    }
  }, [data.enabled, data.opportunities.length]);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-marketplace-intelligence-panel">
        <CardHeader>
          <CardTitle>Marketplace Brain выключен</CardTitle>
          <CardDescription>
            Установите MARKETPLACE_INTELLIGENCE_ENABLED=true
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="admin-marketplace-intelligence-panel"
    >
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Brain className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">
            Marketplace Health
          </h3>
        </div>
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          data-testid="marketplace-health-metrics"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>GMV</CardDescription>
              <CardTitle className="text-xl">
                {formatPrice(data.health.gmv)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Продавцы</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {data.health.sellers}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Покупатели</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {data.health.buyers}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Конверсия в корзину</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {data.health.conversionRate != null
                  ? `${data.health.conversionRate}%`
                  : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Активные товары</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {data.health.activeProducts}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section data-testid="marketplace-opportunities">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">
            Growth Opportunities
          </h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.opportunities.map((opp) => (
            <Card key={opp.id} data-testid={`marketplace-opportunity-${opp.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{opp.title}</CardTitle>
                  <Badge variant={impactBadge(opp.impact)}>{opp.impact}</Badge>
                </div>
                <CardDescription>{opp.reason}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {opp.recommendedAction}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section data-testid="marketplace-problems">
        <h3 className="mb-3 font-heading text-lg font-semibold">Problems</h3>
        <ul className="space-y-2">
          {data.problems.map((problem) => (
            <li
              key={problem.id}
              className="rounded-xl border border-border px-4 py-3 text-sm"
              data-testid={`marketplace-problem-${problem.id}`}
            >
              <p className="font-medium">{problem.title}</p>
              <p className="text-muted-foreground">{problem.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {data.revenueOpportunities.length > 0 ? (
        <section data-testid="marketplace-revenue-opportunities">
          <h3 className="mb-3 font-heading text-lg font-semibold">
            Revenue Intelligence
          </h3>
          <ul className="space-y-2 text-sm">
            {data.revenueOpportunities.map((row) => (
              <li
                key={row.title}
                className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3"
              >
                <p className="font-medium">{row.title}</p>
                <p className="text-muted-foreground">{row.forecast}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section data-testid="marketplace-recommendations">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">
            AI Recommendations
          </h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.recommendations.map((rec) => (
            <Card key={rec.id} data-testid={`marketplace-recommendation-${rec.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{rec.title}</CardTitle>
                  <Badge variant={impactBadge(rec.impact)}>{rec.impact}</Badge>
                </div>
                <CardDescription>{rec.reason}</CardDescription>
              </CardHeader>
              <CardContent>
                {rec.href ? (
                  <Link
                    href={rec.href}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() =>
                      trackEvent({
                        event: ANALYTICS_EVENTS.INTELLIGENCE_RECOMMENDATION_CLICK,
                        route: ROUTES.ADMIN_INTELLIGENCE,
                        entityId: rec.id,
                      })
                    }
                  >
                    {rec.action} →
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">{rec.action}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {data.buyerDemand ? (
        <section data-testid="marketplace-buyer-demand">
          <h3 className="mb-2 font-heading text-lg font-semibold">
            Buyer demand
          </h3>
          <p className="text-sm">
            {data.buyerDemand.headline}{" "}
            {data.buyerDemand.queries.join(", ")}
          </p>
        </section>
      ) : null}
    </div>
  );
}
