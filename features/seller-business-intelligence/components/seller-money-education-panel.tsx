"use client";

import { useEffect, useTransition } from "react";

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
import { trackMoneyExplanationViewAction } from "@/lib/seller-business-intelligence/actions";
import type { MoneyEducationSnapshot } from "@/lib/seller-business-intelligence/types";

type SellerMoneyEducationPanelProps = {
  education: MoneyEducationSnapshot;
};

export function SellerMoneyEducationPanel({
  education,
}: SellerMoneyEducationPanelProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      void trackMoneyExplanationViewAction();
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_MONEY_EXPLANATION_VIEW,
      route: ROUTES.ACCOUNT_BALANCE,
    });
  }, []);

  return (
    <Card data-testid="seller-money-education">
      <CardHeader>
        <CardTitle className="text-lg">Как работают ваши деньги</CardTitle>
        <CardDescription>Путь средств от покупателя до вывода</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-border p-4 text-sm">
          <p className="font-medium">Ожидается</p>
          <p className="mt-2 text-muted-foreground">{education.pendingExplanation}</p>
        </article>
        <article className="rounded-xl border border-border p-4 text-sm">
          <p className="font-medium">Доступно</p>
          <p className="mt-2 text-muted-foreground">{education.availableExplanation}</p>
        </article>
        <article className="rounded-xl border border-border p-4 text-sm md:col-span-2">
          <p className="font-medium">Вывод</p>
          <p className="mt-2 text-muted-foreground">{education.payoutExplanation}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {education.flowSteps.map((step, index) => (
              <span key={step} className="flex items-center gap-2">
                {index > 0 ? <span>↓</span> : null}
                <span className="rounded-md border border-border px-2 py-1">{step}</span>
              </span>
            ))}
          </div>
        </article>
      </CardContent>
    </Card>
  );
}
