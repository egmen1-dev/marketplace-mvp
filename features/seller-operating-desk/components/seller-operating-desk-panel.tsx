"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CircleAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/features/products/mappers";
import {
  DashboardActivity,
  DashboardKpiCards,
  DashboardRecentOrders,
} from "@/features/seller/components/dashboard";
import type { SellerActivityItem, SellerOrderListItem } from "@/features/seller/queries";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import {
  trackOperatingDeskActionClickAction,
  trackOperatingDeskIssueClickAction,
  trackOperatingDeskViewAction,
} from "@/lib/seller-operating-desk/server-actions";
import type {
  OperatingDeskIssue,
  SellerOperatingDeskDashboard,
} from "@/lib/seller-operating-desk/types";

type SellerOperatingDeskPanelProps = {
  data: SellerOperatingDeskDashboard;
  recentOrders: SellerOrderListItem[];
  activity: SellerActivityItem[];
};

export function SellerOperatingDeskPanel({
  data,
  recentOrders,
  activity,
}: SellerOperatingDeskPanelProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!data.enabled) return;
    startTransition(() => {
      void trackOperatingDeskViewAction();
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_OPERATING_DESK_VIEW,
      route: ROUTES.ACCOUNT_BUSINESS,
    });
  }, [data.enabled]);

  if (!data.enabled) {
    return (
      <Card data-testid="seller-operating-desk">
        <CardHeader>
          <CardTitle>Мой бизнес</CardTitle>
          <CardDescription>SELLER_OPERATING_DESK_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function onIssueClick(issue: OperatingDeskIssue) {
    startTransition(() => {
      void trackOperatingDeskIssueClickAction(issue.id);
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_OPERATING_DESK_ISSUE_CLICK,
      route: ROUTES.ACCOUNT_BUSINESS,
    });
  }

  function onActionClick(actionId: string) {
    startTransition(() => {
      void trackOperatingDeskActionClickAction(actionId);
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_OPERATING_DESK_ACTION_CLICK,
      route: ROUTES.ACCOUNT_BUSINESS,
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-operating-desk">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Сейчас происходит</CardTitle>
          <CardDescription data-testid="operating-desk-now-headline">
            {data.now.headline}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{data.now.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Новые", value: data.now.orderCounters.newCount },
              { label: "В работе", value: data.now.orderCounters.inProgress },
              { label: "Просрочено", value: data.now.orderCounters.overdue },
            ].map((pill) => (
              <Badge
                key={pill.label}
                variant={pill.label === "Просрочено" && pill.value > 0 ? "destructive" : "secondary"}
              >
                {pill.label}: {pill.value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <DashboardKpiCards stats={data.now.stats} />

      {data.issues.length > 0 ? (
        <Card data-testid="operating-desk-issues">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleAlert className="size-5 text-amber-500" />
              Требует внимания
            </CardTitle>
            <CardDescription>
              Проблемы, которые могут мешать продажам
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.issues.map((issue) => (
              <article
                key={issue.id}
                className="rounded-xl border border-border p-4"
                data-testid={`operating-desk-issue-${issue.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <IssueIcon severity={issue.severity} />
                      <p className="font-medium">{issue.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {issue.description}
                    </p>
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Почему: </span>
                      {issue.why}
                    </p>
                  </div>
                  <Link
                    href={issue.ctaHref}
                    onClick={() => onIssueClick(issue)}
                    className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border px-3 text-sm"
                  >
                    {issue.ctaLabel}
                  </Link>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="operating-desk-issues-clear">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <TrendingUp className="size-5 text-primary" />
            Срочных проблем нет — сфокусируйтесь на росте продаж
          </CardContent>
        </Card>
      )}

      <Card data-testid="operating-desk-today-actions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-primary" />
            Сделать сегодня
          </CardTitle>
          <CardDescription>Приоритетные действия на сегодня</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.todayActions.map((action) => (
            <div
              key={action.id}
              className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              data-testid={`operating-desk-action-${action.id}`}
            >
              <div>
                <p className="font-medium">{action.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{action.why}</p>
              </div>
              <Link
                href={action.ctaHref}
                onClick={() => onActionClick(action.id)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                {action.ctaLabel}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="operating-desk-money">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="size-5 text-primary" />
            Деньги
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{data.money.headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.money.explanation}
            </p>
            {data.money.paidAmount > 0 ? (
              <p className="mt-2 text-sm">
                Выведено: {formatPrice(data.money.paidAmount)}
              </p>
            ) : null}
          </div>
          <Link
            href={data.money.ctaHref}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            {data.money.ctaLabel}
          </Link>
        </CardContent>
      </Card>

      {data.coach ? (
        <Card data-testid="operating-desk-coach">
          <CardHeader>
            <CardTitle className="text-base">Следующий шаг по пути продавца</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium">{data.coach.headline}</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Почему: </span>
              {data.coach.why}
            </p>
            {data.coach.bullets.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {data.coach.bullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            <Link
              href={data.coach.ctaHref}
              onClick={() => onActionClick("journey-coach-inline")}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              {data.coach.ctaLabel}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardRecentOrders orders={recentOrders} />
        <DashboardActivity items={activity} />
      </div>
    </div>
  );
}

function IssueIcon({ severity }: { severity: OperatingDeskIssue["severity"] }) {
  if (severity === "critical") {
    return <AlertTriangle className="size-4 text-destructive" />;
  }
  if (severity === "warning") {
    return <CircleAlert className="size-4 text-amber-500" />;
  }
  return <TrendingUp className="size-4 text-primary" />;
}
