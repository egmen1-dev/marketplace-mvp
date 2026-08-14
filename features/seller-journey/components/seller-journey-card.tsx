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
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import {
  trackSellerJourneyCtaAction,
  trackSellerJourneyViewAction,
} from "@/lib/seller-journey/actions";
import type { SellerJourneyDashboard } from "@/lib/seller-journey/types";

type SellerJourneyCardProps = {
  data: SellerJourneyDashboard;
  compact?: boolean;
};

export function SellerJourneyCard({ data, compact = false }: SellerJourneyCardProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!data.enabled) return;
    startTransition(() => {
      void trackSellerJourneyViewAction();
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_JOURNEY_VIEW,
      route: ROUTES.ACCOUNT_GROWTH,
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_STEP_VIEW,
      route: ROUTES.ACCOUNT_GROWTH,
    });
  }, [data.enabled]);

  if (!data.enabled) {
    return (
      <Card data-testid="seller-journey-card">
        <CardHeader>
          <CardTitle>Ваш путь продавца</CardTitle>
          <CardDescription>SELLER_JOURNEY_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function onCtaClick() {
    startTransition(() => {
      void trackSellerJourneyCtaAction();
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_NEXT_ACTION_CLICK,
      route: ROUTES.ACCOUNT_GROWTH,
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-journey-card">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <Sparkles className="size-5 text-primary" />
            Ваш путь продавца
          </CardTitle>
          <CardDescription data-testid="seller-journey-progress-label">
            {data.progressPercent}% · шаг {data.progressCurrent} из {data.progressTotal}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            data-testid="seller-journey-progress-bar"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(data.progressPercent, 4)}%` }}
            />
          </div>

          {!compact ? (
            <ul className="space-y-2" data-testid="seller-journey-checklist">
              {data.checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-3 text-sm">
                  {item.done ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <Circle
                      className={`mt-0.5 size-4 shrink-0 ${
                        item.current ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  )}
                  <span
                    className={
                      item.done
                        ? "text-muted-foreground line-through"
                        : item.current
                          ? "font-medium"
                          : undefined
                    }
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <SellerJourneyCoach data={data} onCtaClick={onCtaClick} />
        </CardContent>
      </Card>

      {data.milestones.some((m) => m.achievedAt) ? (
        <Card data-testid="seller-journey-milestones">
          <CardHeader>
            <CardTitle className="text-base">Достижения</CardTitle>
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

type SellerJourneyCoachProps = {
  data: SellerJourneyDashboard;
  onCtaClick?: () => void;
};

export function SellerJourneyCoach({ data, onCtaClick }: SellerJourneyCoachProps) {
  return (
    <div
      className="rounded-xl border border-primary/20 bg-primary/5 p-4"
      data-testid="seller-journey-coach"
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Следующий шаг</p>
        <Badge variant="secondary">AI Seller Coach</Badge>
      </div>
      <p className="mt-2 font-heading text-base font-semibold">{data.coach.headline}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Почему: </span>
        {data.coach.why}
      </p>
      {data.coach.bullets.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {data.coach.bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {data.coach.ctaHref ? (
        <Link
          href={data.coach.ctaHref}
          onClick={onCtaClick}
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          data-testid="seller-journey-coach-cta"
        >
          {data.coach.ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

type SellerJourneyEmptyStateProps = {
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

export function SellerJourneyEmptyState({
  title,
  body,
  bullets,
  ctaLabel,
  ctaHref,
}: SellerJourneyEmptyStateProps) {
  return (
    <div
      className="rounded-2xl border border-dashed border-border bg-card/60 p-6"
      data-testid="seller-journey-empty-state"
    >
      <p className="font-heading text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
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
