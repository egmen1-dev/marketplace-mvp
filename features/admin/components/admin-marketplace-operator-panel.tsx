"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ClipboardList, Rocket, Target, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import type { MarketplaceOperatorDashboard } from "@/lib/marketplace-operator/types";

type AdminMarketplaceOperatorPanelProps = {
  data: MarketplaceOperatorDashboard;
};

function priorityVariant(priority: string) {
  if (priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "secondary";
  return "outline";
}

export function AdminMarketplaceOperatorPanel({
  data,
}: AdminMarketplaceOperatorPanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.OPERATOR_VIEW,
      route: ROUTES.ADMIN_OPERATOR,
    });
    if (data.strategies.length > 0) {
      trackEvent({
        event: ANALYTICS_EVENTS.STRATEGY_VIEW,
        route: ROUTES.ADMIN_OPERATOR,
      });
    }
    if (data.actionPlans.length > 0) {
      trackEvent({
        event: ANALYTICS_EVENTS.ACTION_PLAN_VIEW,
        route: ROUTES.ADMIN_OPERATOR,
      });
    }
  }, [data.enabled, data.strategies.length, data.actionPlans.length]);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-marketplace-operator-panel">
        <CardHeader>
          <CardTitle>Marketplace Operator выключен</CardTitle>
          <CardDescription>
            Установите MARKETPLACE_OPERATOR_ENABLED=true
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const topTasks = data.actionPlans.slice(0, data.status.topTaskCount);

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="admin-marketplace-operator-panel"
    >
      <section data-testid="operator-marketplace-status">
        <div className="mb-3 flex items-center gap-2">
          <Target className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Marketplace Status</h3>
        </div>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">{data.status.headline}</CardTitle>
            <CardDescription>{data.status.summary}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Оценка здоровья (advisory):{" "}
            <span className="font-semibold tabular-nums">
              {data.status.healthScore}/100
            </span>
          </CardContent>
        </Card>
      </section>

      <section data-testid="operator-top-problems">
        <div className="mb-3 flex items-center gap-2">
          <TriangleAlert className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Top Problems</h3>
        </div>
        <ul className="space-y-2">
          {data.topProblems.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-border px-4 py-3 text-sm"
              data-testid={`operator-diagnosis-${d.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{d.issue}</p>
                <Badge variant={priorityVariant(d.severity)}>{d.severity}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">
                {d.category} · {d.impact}
              </p>
              <ul className="mt-2 list-inside list-disc text-muted-foreground">
                {d.causes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="operator-growth-plans">
        <div className="mb-3 flex items-center gap-2">
          <Rocket className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Growth Plans</h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.strategies.map((strategy) => (
            <Card key={strategy.id} data-testid={`operator-strategy-${strategy.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{strategy.goal}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {strategy.weeks.map((week) => (
                  <div key={week.week}>
                    <p className="font-medium">{week.label}</p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      {week.tasks.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section data-testid="operator-recommended-actions">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">
            Recommended Actions
          </h3>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          {topTasks.length} главные задачи площадки сейчас — требуют ручного
          approval, AI не выполняет изменения автоматически.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.actionPlans.map((plan) => (
            <Card key={plan.id} data-testid={`operator-action-plan-${plan.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  <Badge variant={priorityVariant(plan.priority)}>
                    {plan.priority}
                  </Badge>
                </div>
                <CardDescription>
                  Impact {plan.impactScore}/100 · {plan.expectedEffect}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.actions.map((action) => (
                    <li key={`${action.type}-${action.description}`}>
                      <span className="font-medium">{action.type}:</span>{" "}
                      {action.description}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() =>
                    trackEvent({
                      event: ANALYTICS_EVENTS.RECOMMENDATION_EXECUTE,
                      route: ROUTES.ADMIN_OPERATOR,
                      entityId: plan.id,
                    })
                  }
                >
                  Отметить к выполнению (advisory) →
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Связанный слой:{" "}
        <Link href={ROUTES.ADMIN_INTELLIGENCE} className="text-primary hover:underline">
          Marketplace Intelligence
        </Link>
      </p>
    </div>
  );
}
