"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Circle,
  Megaphone,
  Package,
  ShoppingBag,
  Wallet,
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
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import {
  trackAiAdviceClickAction,
  trackOperationsViewAction,
  trackPriorityClickAction,
} from "@/lib/seller-operations/actions";
import type { SellerOperationsWorkspace } from "@/lib/seller-operations/types";

type SellerOperationsTodayPanelProps = {
  workspace: SellerOperationsWorkspace;
};

export function SellerOperationsTodayPanel({
  workspace,
}: SellerOperationsTodayPanelProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!workspace.enabled) return;
    startTransition(() => {
      void trackOperationsViewAction();
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_OPERATIONS_VIEW,
      route: ROUTES.ACCOUNT_BUSINESS,
    });
  }, [workspace.enabled]);

  if (!workspace.enabled) {
    return (
      <Card data-testid="seller-operations-today">
        <CardHeader>
          <CardTitle>Сегодня</CardTitle>
          <CardDescription>SELLER_OPERATIONS_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function onPriorityClick(id: string) {
    startTransition(() => {
      void trackPriorityClickAction(id);
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_PRIORITY_CLICK,
      route: ROUTES.ACCOUNT_BUSINESS,
    });
  }

  function onAiClick() {
    startTransition(() => {
      void trackAiAdviceClickAction();
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_AI_ADVICE_CLICK,
      route: ROUTES.ACCOUNT_BUSINESS,
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-operations-today">
      <Badge className="w-fit" variant="secondary">
        Сегодня
      </Badge>

      {workspace.emptyState ? (
        <Card data-testid="operations-empty-state">
          <CardHeader>
            <CardTitle>{workspace.emptyState.title}</CardTitle>
            <CardDescription>{workspace.emptyState.body}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {workspace.emptyState.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Link
              href={workspace.emptyState.ctaHref}
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              {workspace.emptyState.ctaLabel}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card data-testid="operations-today-summary">
        <CardHeader>
          <CardTitle className="text-lg">Сегодня у вас</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {workspace.todaySummary.map((line) => (
              <li
                key={line.id}
                className={line.highlight ? "font-medium text-foreground" : "text-muted-foreground"}
              >
                {line.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="operations-daily-priorities">
        <CardHeader>
          <CardTitle className="text-lg">Сегодня важно</CardTitle>
          <CardDescription>Не более 5 приоритетов на день</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {workspace.priorities.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-border p-4"
              data-testid={`operations-priority-${item.id}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {item.rank}.{" "}
                    {item.priority === "high" ? "Высокий приоритет" : "Приоритет"}
                  </p>
                  <p className="mt-1 font-medium">{item.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Почему: </span>
                    {item.why}
                  </p>
                </div>
                <Link
                  href={item.ctaHref}
                  onClick={() => onPriorityClick(item.id)}
                  className="inline-flex h-10 shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  {item.ctaLabel}
                </Link>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="operations-order-block">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="size-4" />
              Заказы требуют внимания
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Новые заказы</p>
              <p className="font-heading text-2xl font-semibold">
                {workspace.orders.newOrders}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Сегодня отправить</p>
              <p className="font-heading text-2xl font-semibold">
                {workspace.orders.shipToday}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Есть задержки</p>
              <p className="font-heading text-2xl font-semibold text-destructive">
                {workspace.orders.overdue}
              </p>
            </div>
            <Link
              href={workspace.orders.ctaHref}
              className="col-span-2 inline-flex h-10 items-center justify-center rounded-xl border border-border text-sm font-medium"
            >
              Перейти к заказам
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="operations-money-block">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4" />
              Деньги
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Продажи:{" "}
              <span className="font-medium">
                {formatPrice(workspace.money.salesTotal)}
              </span>
            </p>
            <p>
              Ожидается:{" "}
              <span className="font-medium">
                {formatPrice(workspace.money.pendingAmount)}
              </span>
            </p>
            <p>
              Доступно:{" "}
              <span className="font-medium">
                {formatPrice(workspace.money.availableAmount)}
              </span>
            </p>
            <Link
              href={workspace.money.ctaHref}
              className="mt-2 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              {workspace.money.ctaLabel}
            </Link>
          </CardContent>
        </Card>
      </div>

      {workspace.products.length > 0 ? (
        <Card data-testid="operations-products-block">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4" />
              Товары требуют внимания
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {workspace.products.map((product) => (
              <article
                key={product.id}
                className="rounded-xl border border-border p-3 text-sm"
              >
                <p className="font-medium">{product.productName}</p>
                <p className="mt-1">{product.headline}</p>
                <p className="mt-1 text-muted-foreground">{product.suggestion}</p>
                <Link
                  href={product.ctaHref}
                  className="mt-2 inline-flex text-sm font-medium text-primary"
                >
                  {product.ctaLabel}
                </Link>
              </article>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {workspace.inventory.length > 0 ? (
        <Card data-testid="operations-inventory-block">
          <CardHeader>
            <CardTitle className="text-base">Остатки</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {workspace.inventory.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-medium">{item.productName}</p>
                <p className="text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card data-testid="operations-ai-advice">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4" />
            AI совет дня
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">{workspace.aiAdvice.headline}</p>
          <p>
            <span className="font-medium">Главная возможность: </span>
            {workspace.aiAdvice.opportunity}
          </p>
          <p>
            <span className="font-medium">Самое эффективное действие: </span>
            {workspace.aiAdvice.action}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Почему: </span>
            {workspace.aiAdvice.why}
          </p>
          <Link
            href={workspace.aiAdvice.ctaHref}
            onClick={onAiClick}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            {workspace.aiAdvice.ctaLabel}
          </Link>
        </CardContent>
      </Card>

      <Card data-testid="operations-promotion-block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4" />
            Продвижение сегодня
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {workspace.promotion.activeCampaigns > 0 ? (
            <p>{workspace.promotion.activeCampaigns} кампании работают</p>
          ) : (
            <p className="text-muted-foreground">
              Активных кампаний пока нет — подготовьте карточки перед запуском
            </p>
          )}
          {workspace.promotion.bestCampaign ? (
            <p className="mt-2">
              Лучшая: {workspace.promotion.bestCampaign.name} ·{" "}
              {workspace.promotion.bestCampaign.metric}
            </p>
          ) : null}
          {workspace.promotion.weakCampaign ? (
            <p className="mt-2 text-muted-foreground">
              {workspace.promotion.weakCampaign.name}:{" "}
              {workspace.promotion.weakCampaign.recommendation}
            </p>
          ) : null}
          <Link
            href={workspace.promotion.ctaHref}
            className="mt-3 inline-flex h-9 items-center rounded-lg border border-border px-3"
          >
            Продвижение
          </Link>
        </CardContent>
      </Card>

      <Card data-testid="operations-checklist">
        <CardHeader>
          <CardTitle className="text-base">Путь развития</CardTitle>
          <CardDescription>Ваш прогресс</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {workspace.checklist.map((step) => (
              <li key={step.id} className="flex items-center gap-2">
                {step.done ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={step.done ? "text-muted-foreground line-through" : undefined}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="operations-result-summary">
        <CardContent className="flex items-center gap-2 p-4 text-sm">
          <ArrowRight className="size-4 text-primary" />
          <span>{workspace.resultSummary}</span>
        </CardContent>
      </Card>
    </div>
  );
}
