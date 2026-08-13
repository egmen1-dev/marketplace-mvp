"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

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
import { onboardingProgressPercent } from "@/lib/marketplace-education/coach";
import type { EducationChecklist } from "@/lib/marketplace-education/types";

type SellerOnboardingPanelProps = {
  checklist: EducationChecklist;
};

export function SellerOnboardingPanel({ checklist }: SellerOnboardingPanelProps) {
  const progress = onboardingProgressPercent(
    checklist.completedCount,
    checklist.totalCount,
  );

  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.EDUCATION_GUIDE_STARTED,
      route: ROUTES.ACCOUNT_ONBOARDING,
      entityId: checklist.id,
    });
    if (checklist.completedCount === checklist.totalCount) {
      trackEvent({
        event: ANALYTICS_EVENTS.EDUCATION_GUIDE_COMPLETED,
        route: ROUTES.ACCOUNT_ONBOARDING,
        entityId: checklist.id,
      });
    }
  }, [checklist.completedCount, checklist.id, checklist.totalCount]);

  return (
    <Card data-testid="seller-onboarding-panel">
      <CardHeader>
        <CardTitle>{checklist.title}</CardTitle>
        <CardDescription>
          Прогресс: {checklist.completedCount}/{checklist.totalCount} ({progress}
          %)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-4">
          {checklist.items.map((item, index) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-xl border border-border/60 px-3 py-3"
              data-testid={`onboarding-step-${item.id}`}
            >
              {item.completed ? (
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-emerald-600"
                  aria-hidden
                />
              ) : (
                <Circle
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  Шаг {index + 1}: {item.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.explanation}
                </p>
                {!item.completed && item.href ? (
                  <Button
                    size="sm"
                    className="mt-2"
                    nativeButton={false}
                    render={<Link href={item.href} />}
                  >
                    Перейти
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
