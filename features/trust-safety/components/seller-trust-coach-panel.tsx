"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

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
import type { SellerTrustCoach } from "@/lib/trust-safety/types";

type SellerTrustCoachPanelProps = {
  coach: SellerTrustCoach;
  route?: string;
};

export function SellerTrustCoachPanel({
  coach,
  route = ROUTES.ACCOUNT_GROWTH,
}: SellerTrustCoachPanelProps) {
  useEffect(() => {
    if (!coach.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_TRUST_VIEW,
      route,
    });
  }, [coach.enabled, route]);

  if (!coach.enabled) return null;

  function onImprovementClick() {
    trackEvent({
      event: ANALYTICS_EVENTS.TRUST_IMPROVEMENT_CLICK,
      route,
    });
  }

  return (
    <Card data-testid="seller-trust-coach-panel">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" aria-hidden />
          <CardTitle className="text-lg">
            Как повысить доверие покупателей
          </CardTitle>
        </div>
        <CardDescription>{coach.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div data-testid="seller-trust-score">
          <p className="text-sm text-muted-foreground">Ваш уровень</p>
          <p className="font-heading text-2xl font-semibold">
            {coach.score}/100
          </p>
          <p className="text-sm text-muted-foreground">{coach.levelLabel}</p>
        </div>

        {coach.improvements.length > 0 ? (
          <div data-testid="seller-trust-improvements">
            <p className="mb-2 text-sm font-medium text-foreground">
              Что улучшить
            </p>
            <ul className="space-y-2">
              {coach.improvements.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">{item.action}</p>
                  <p className="text-muted-foreground">{item.why}</p>
                  {item.href ? (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-primary"
                      nativeButton={false}
                      render={
                        <Link
                          href={item.href}
                          onClick={onImprovementClick}
                        />
                      }
                    >
                      Перейти
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
