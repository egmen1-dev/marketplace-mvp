"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { Check, Circle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import {
  dismissSellerWelcomeAction,
  startSellerOnboardingAction,
  trackGuideCtaAction,
} from "@/lib/seller-first-entry/actions";
import type { SellerFirstEntryDashboard } from "@/lib/seller-first-entry/types";
import { FIRST_ENTRY_TOOLTIPS } from "@/lib/seller-first-entry/types";

type SellerStartPanelProps = {
  data: SellerFirstEntryDashboard;
};

export function SellerStartPanel({ data }: SellerStartPanelProps) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!data.enabled) return;
    startTransition(() => {
      void startSellerOnboardingAction();
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_ENTRY_STARTED,
      route: ROUTES.ACCOUNT_SELLER_START,
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_ONBOARDING_STARTED,
      route: ROUTES.ACCOUNT_SELLER_START,
    });
  }, [data.enabled]);

  if (!data.enabled) {
    return (
      <Card data-testid="seller-start-panel">
        <CardHeader>
          <CardTitle>Старт продавца</CardTitle>
          <CardDescription>SELLER_FIRST_ENTRY_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function onCtaClick() {
    startTransition(async () => {
      await trackGuideCtaAction();
    });
  }

  function onDismiss() {
    startTransition(async () => {
      await dismissSellerWelcomeAction();
      window.location.href = ROUTES.ACCOUNT_PRODUCTS;
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-start-panel">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            Добро пожаловать в {APP_NAME} 👋
          </CardTitle>
          <CardDescription>Начнём с вашего первого товара.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium">Мы поможем:</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>✓ создать карточку товара</li>
              <li>✓ подготовить её для покупателей</li>
              <li>✓ получить первые продажи</li>
              <li>✓ разобраться с продвижением</li>
              <li>✓ вывести заработанные деньги</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium">Ваш путь продавца:</p>
            <ul className="mt-3 space-y-2" data-testid="seller-start-journey">
              {data.journey.map((step) => (
                <li key={step.id} className="flex items-center gap-2 text-sm">
                  {step.done ? (
                    <Check className="size-4 text-primary" />
                  ) : (
                    <Circle
                      className={`size-4 ${step.current ? "text-primary" : "text-muted-foreground"}`}
                    />
                  )}
                  <span className={step.done ? "text-muted-foreground line-through" : undefined}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
            <p
              className="mt-3 text-sm text-muted-foreground"
              data-testid="seller-start-progress"
            >
              Прогресс: {data.progressCurrent} / {data.progressTotal}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={data.guide.ctaHref}
              onClick={onCtaClick}
              className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
              data-testid="seller-start-primary-cta"
            >
              {data.progressCurrent === 0 ? "Создать первый товар" : data.guide.ctaLabel}
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              disabled={pending}
              className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm"
            >
              Продолжить без тура
            </button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="seller-next-step-block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-primary" />
            Ваш следующий шаг
          </CardTitle>
          <Badge variant="secondary">Seller Journey Coach</Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium">{data.guide.headline}</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Почему: </span>
            {data.guide.why}
          </p>
          {data.guide.actions.length > 0 ? (
            <div>
              <p className="font-medium">Что сделать:</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {data.guide.actions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link
            href={data.guide.ctaHref}
            onClick={onCtaClick}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            data-testid="seller-guide-cta"
          >
            {data.guide.ctaLabel}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Подсказки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{FIRST_ENTRY_TOOLTIPS.productCard}</p>
          <p>{FIRST_ENTRY_TOOLTIPS.photos}</p>
          <p>{FIRST_ENTRY_TOOLTIPS.characteristics}</p>
          <p>{FIRST_ENTRY_TOOLTIPS.balance}</p>
          <p>{FIRST_ENTRY_TOOLTIPS.promotion}</p>
        </CardContent>
      </Card>
    </div>
  );
}

type SellerNextStepBannerProps = {
  data: SellerFirstEntryDashboard;
};

export function SellerNextStepBanner({ data }: SellerNextStepBannerProps) {
  if (!data.enabled || !data.showNextStep) return null;

  return (
    <Card className="border-primary/20 bg-primary/5" data-testid="seller-next-step-banner">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Ваш следующий шаг</p>
          <p className="mt-1 font-heading text-base font-semibold">{data.guide.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.guide.why}</p>
        </div>
        <Link
          href={data.guide.ctaHref}
          className="inline-flex h-10 shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {data.guide.ctaLabel}
        </Link>
      </CardContent>
    </Card>
  );
}
