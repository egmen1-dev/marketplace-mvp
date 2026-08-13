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
        <CardTitle className="text-base">AI Coach · {coach.headline}</CardTitle>
        <CardDescription>{coach.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {coach.steps.map((step) => (
            <li key={step.order}>{step.text}</li>
          ))}
        </ol>
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
