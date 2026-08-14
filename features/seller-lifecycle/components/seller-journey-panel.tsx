"use client";

import { useEffect } from "react";
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
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import { trackSellerJourneyView } from "@/lib/seller-lifecycle/analytics";
import type { SellerLifecycleDashboard } from "@/lib/seller-lifecycle/types";

type SellerJourneyPanelProps = {
  data: SellerLifecycleDashboard;
};

export function SellerJourneyPanel({ data }: SellerJourneyPanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    void trackSellerJourneyView();
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_JOURNEY_VIEW,
      route: ROUTES.ACCOUNT_COMMAND_CENTER,
    });
  }, [data.enabled]);

  if (!data.enabled) {
    return (
      <Card data-testid="seller-journey-panel">
        <CardHeader>
          <CardTitle>Ваш путь продавца</CardTitle>
          <CardDescription>SELLER_LIFECYCLE_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-journey-panel">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Ваш путь продавца
          </CardTitle>
          <CardDescription data-testid="seller-journey-progress">
            Ваш путь: {data.progressCurrent} из {data.progressTotal}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="space-y-2" data-testid="seller-journey-steps">
            {data.steps.map((step) => (
              <li
                key={step.id}
                className="flex items-start gap-3 text-sm"
                data-testid={`journey-step-${step.id}`}
              >
                {step.done ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                ) : (
                  <Circle
                    className={`mt-0.5 size-4 shrink-0 ${
                      step.current ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                )}
                <span
                  className={
                    step.done
                      ? "text-muted-foreground line-through"
                      : step.current
                        ? "font-medium"
                        : undefined
                  }
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ul>

          {data.nextStep ? (
            <div className="rounded-xl border border-dashed border-border p-4">
              <p className="text-sm font-medium">Следующий шаг</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.nextStep.label}
              </p>
              {data.nextStep.href ? (
                <Link
                  href={data.nextStep.href}
                  className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                  data-testid="seller-journey-next-cta"
                >
                  {data.nextStep.id === "product" ? "Создать товар" : "Продолжить"}
                </Link>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card data-testid="seller-journey-coach">
        <CardHeader>
          <CardTitle>AI советует</CardTitle>
          <Badge variant={data.coach.tone === "success" ? "default" : "secondary"}>
            Seller Journey Coach
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="font-medium">{data.coach.headline}</p>
          <p className="text-sm text-muted-foreground">{data.coach.body}</p>
          {data.coach.bullets.length > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {data.coach.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {data.coach.ctaHref ? (
            <Link
              href={data.coach.ctaHref}
              className="inline-flex h-10 w-fit items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              data-testid="seller-journey-coach-cta"
            >
              {data.coach.ctaLabel}
            </Link>
          ) : null}
        </CardContent>
      </Card>

      {data.milestones.some((m) => m.achievedAt) ? (
        <Card data-testid="seller-journey-milestones">
          <CardHeader>
            <CardTitle>Достижения</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.milestones
              .filter((m) => m.achievedAt)
              .map((m) => (
                <p key={m.type} className="text-sm">
                  {m.emoji} {m.label}
                </p>
              ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

type SellerEmptyStateProps = {
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

export function SellerEmptyState({
  title,
  body,
  bullets,
  ctaLabel,
  ctaHref,
}: SellerEmptyStateProps) {
  return (
    <div
      className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center"
      data-testid="seller-empty-state"
    >
      <p className="font-heading text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <ul className="mx-auto mt-3 max-w-md space-y-1 text-left text-sm text-muted-foreground">
        {bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
