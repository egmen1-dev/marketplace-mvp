"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
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
import type { SellerCoachRecommendation } from "@/lib/marketplace-education/types";

type SellerAiCoachPanelProps = {
  coach: SellerCoachRecommendation;
};

export function SellerAiCoachPanel({ coach }: SellerAiCoachPanelProps) {
  function onActionClick() {
    trackEvent({
      event: ANALYTICS_EVENTS.EDUCATION_COACH_ACTION_CLICK,
      route: ROUTES.ACCOUNT_GROWTH,
    });
  }

  return (
    <Card
      className="border-sky-500/20 bg-sky-500/5"
      data-testid="seller-ai-coach-panel"
    >
      <CardHeader>
        <CardTitle className="text-base">{coach.headline}</CardTitle>
        <CardDescription>{coach.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {coach.metrics ? (
          <dl
            className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-center text-xs"
            data-testid="seller-coach-metrics"
          >
            <div>
              <dt className="text-muted-foreground">Просмотры</dt>
              <dd className="font-semibold tabular-nums">{coach.metrics.views}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">В корзине</dt>
              <dd className="font-semibold tabular-nums">
                {coach.metrics.addToCart}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Продажи</dt>
              <dd className="font-semibold tabular-nums">{coach.metrics.sales}</dd>
            </div>
          </dl>
        ) : null}
        <p className="text-sm">
          <span className="font-medium">Анализ: </span>
          <span className="text-muted-foreground">{coach.analysis}</span>
        </p>
        <div>
          <p className="mb-2 text-sm font-medium">Рекомендуем:</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {coach.steps.map((step) => (
              <li key={step.order}>{step.text}</li>
            ))}
          </ol>
        </div>
        {coach.href && coach.ctaLabel ? (
          <Button
            size="sm"
            className="w-fit rounded-xl"
            nativeButton={false}
            render={<Link href={coach.href} onClick={onActionClick} />}
          >
            {coach.ctaLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
