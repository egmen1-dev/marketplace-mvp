"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  Check,
  Circle,
  Megaphone,
  Sparkles,
  Target,
} from "lucide-react";

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
import {
  trackActionClickAction,
  trackBusinessViewAction,
  trackProblemViewAction,
} from "@/lib/seller-business-intelligence/actions";
import type { SellerBusinessDashboard } from "@/lib/seller-business-intelligence/types";

type SellerBusinessIntelligencePanelProps = {
  dashboard: SellerBusinessDashboard;
};

export function SellerBusinessIntelligencePanel({
  dashboard,
}: SellerBusinessIntelligencePanelProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!dashboard.enabled) return;
    startTransition(() => {
      void trackBusinessViewAction();
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_BUSINESS_VIEW,
      route: ROUTES.ACCOUNT_BUSINESS,
    });
  }, [dashboard.enabled]);

  if (!dashboard.enabled) {
    return (
      <Card data-testid="seller-business-intelligence">
        <CardHeader>
          <CardTitle>AI бизнес-помощник</CardTitle>
          <CardDescription>SELLER_BUSINESS_INTELLIGENCE_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function onActionClick(actionId: string) {
    startTransition(() => {
      void trackActionClickAction(actionId);
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_ACTION_CLICK,
      route: ROUTES.ACCOUNT_BUSINESS,
    });
  }

  function onProblemClick(problemId: string) {
    startTransition(() => {
      void trackProblemViewAction(problemId);
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_PROBLEM_VIEW,
      route: ROUTES.ACCOUNT_BUSINESS,
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-business-intelligence">
      <Badge className="w-fit gap-1" variant="secondary">
        <Sparkles className="size-3" />
        AI бизнес-помощник
      </Badge>

      {dashboard.emptyState ? (
        <Card data-testid="bi-empty-state">
          <CardHeader>
            <CardTitle>{dashboard.emptyState.title}</CardTitle>
            <CardDescription>{dashboard.emptyState.body}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {dashboard.emptyState.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Link
              href={dashboard.emptyState.ctaHref}
              onClick={() => onActionClick(`empty-${dashboard.emptyState!.kind}`)}
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              {dashboard.emptyState.ctaLabel}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card data-testid="bi-summary">
        <CardHeader>
          <CardTitle className="text-lg">Сейчас происходит</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium">{dashboard.summary.headline}</p>
          <div>
            <p className="text-muted-foreground">За последние 7 дней:</p>
            <ul className="mt-1 space-y-1">
              {dashboard.summary.periodLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          {dashboard.summary.mainProblem ? (
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="font-medium">Главная проблема:</p>
              <p className="mt-1 text-muted-foreground">
                {dashboard.summary.mainProblem}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card data-testid="bi-next-action" className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="size-5 text-primary" />
            Ваш следующий шаг
          </CardTitle>
          <CardDescription>Одно главное действие на сегодня</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Что сделать
            </p>
            <p className="mt-1 text-base font-medium">{dashboard.nextAction.title}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Почему
            </p>
            <p className="mt-1 text-muted-foreground">{dashboard.nextAction.why}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Что это даст
            </p>
            <p className="mt-1 text-muted-foreground">{dashboard.nextAction.benefit}</p>
          </div>
          <Link
            href={dashboard.nextAction.ctaHref}
            onClick={() => onActionClick(dashboard.nextAction.id)}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            data-testid="bi-next-action-cta"
          >
            {dashboard.nextAction.ctaLabel}
          </Link>
        </CardContent>
      </Card>

      {dashboard.problems.length > 0 ? (
        <Card data-testid="bi-diagnosis">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="size-5" />
              Что мешает расти
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dashboard.problems.map((problem) => (
              <article
                key={problem.id}
                className="rounded-xl border border-border p-4 text-sm"
                data-testid={`bi-problem-${problem.id}`}
              >
                <p className="font-medium">{problem.title}</p>
                <p className="mt-1 text-muted-foreground">{problem.explanation}</p>
                <Link
                  href={problem.ctaHref}
                  onClick={() => onProblemClick(problem.id)}
                  className="mt-2 inline-flex text-sm font-medium text-primary"
                >
                  {problem.ctaLabel}
                </Link>
              </article>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card data-testid="bi-assistant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="size-5" />
            Ваш AI помощник
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium">{dashboard.assistant.headline}</p>
          <div>
            <p className="font-medium">Сильные стороны:</p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {dashboard.assistant.strengths.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Что улучшить:</p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {dashboard.assistant.improvements.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <p>
            <span className="font-medium">Следующий шаг: </span>
            {dashboard.assistant.nextStep}
          </p>
          <Link
            href={dashboard.assistant.ctaHref}
            onClick={() => onActionClick("assistant-cta")}
            className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium"
            data-testid="bi-assistant-cta"
          >
            {dashboard.assistant.ctaLabel}
          </Link>
        </CardContent>
      </Card>

      <Card data-testid="bi-promotion">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4" />
            Продвижение
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">{dashboard.promotion.headline}</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {dashboard.promotion.bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">{dashboard.promotion.recommendation}</p>
          <Link
            href={dashboard.promotion.ctaHref}
            onClick={() => onActionClick("promotion-cta")}
            className="mt-3 inline-flex h-9 items-center rounded-lg border border-border px-3"
          >
            {dashboard.promotion.ctaLabel}
          </Link>
        </CardContent>
      </Card>

      <Card data-testid="bi-first-journey">
        <CardHeader>
          <CardTitle className="text-base">Путь развития</CardTitle>
          <CardDescription>От первого товара до первых денег</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {dashboard.firstJourney.map((step) => (
              <li key={step.id} className="flex gap-3">
                {step.done ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className={step.done ? "text-muted-foreground line-through" : "font-medium"}>
                    {step.step}. {step.label}
                  </p>
                  {!step.done ? (
                    <p className="mt-1 text-muted-foreground">{step.explanation}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
