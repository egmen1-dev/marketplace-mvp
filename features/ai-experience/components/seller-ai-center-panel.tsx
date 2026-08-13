"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

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
import { formatOneActionHeadline } from "@/lib/ai-experience/recommendations";
import type { SellerAiCenterDashboard } from "@/lib/ai-experience/types";

type SellerAiCenterPanelProps = {
  data: SellerAiCenterDashboard;
};

export function SellerAiCenterPanel({ data }: SellerAiCenterPanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.AI_CENTER_VIEW,
      route: ROUTES.ACCOUNT_AI_CENTER,
    });
    if (data.priority) {
      trackEvent({
        event: ANALYTICS_EVENTS.AI_RECOMMENDATION_VIEW,
        route: ROUTES.ACCOUNT_AI_CENTER,
        entityId: data.priority.id,
      });
    }
  }, [data.enabled, data.priority]);

  if (!data.enabled) {
    return (
      <Card data-testid="seller-ai-center-panel">
        <CardHeader>
          <CardTitle>{data.title}</CardTitle>
          <CardDescription>AI_EXPERIENCE_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function onActionClick() {
    trackEvent({
      event: ANALYTICS_EVENTS.AI_ACTION_CLICK,
      route: ROUTES.ACCOUNT_AI_CENTER,
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-ai-center-panel">
      <section data-testid="ai-growth-level">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Мой уровень</h3>
        </div>
        {data.growthLevel ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Growth Score: {data.growthLevel.score}
              </CardTitle>
              <CardDescription>{data.growthLevel.levelLabel}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {data.growthLevel.strengths.length > 0 ? (
                <p>Сильные стороны: {data.growthLevel.strengths.join(" · ")}</p>
              ) : null}
              {data.growthLevel.weaknesses.length > 0 ? (
                <p className="mt-1">
                  Зоны роста: {data.growthLevel.weaknesses.join(" · ")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Включите SELLER_GROWTH_ENABLED для Growth Score
          </p>
        )}
      </section>

      <section data-testid="ai-happening">
        <h3 className="mb-2 font-heading text-lg font-semibold">Что происходит</h3>
        <p className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
          {data.happeningSummary}
        </p>
      </section>

      {data.priority ? (
        <section data-testid="ai-priority-action">
          <h3 className="mb-2 font-heading text-lg font-semibold">
            Главный следующий шаг
          </h3>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {formatOneActionHeadline(data.priority)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Почему: </span>
                {data.priority.why}
              </p>
              <p>
                <span className="font-medium">Что даст: </span>
                {data.priority.benefit}
              </p>
              <p>
                <span className="font-medium">Как: </span>
                {data.priority.howTo}
              </p>
              {data.priority.href ? (
                <Button
                  size="sm"
                  className="mt-2"
                  nativeButton={false}
                  render={
                    <Link href={data.priority.href} onClick={onActionClick} />
                  }
                >
                  Выполнить
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {data.opportunities.length > 0 ? (
        <section data-testid="ai-opportunities">
          <h3 className="mb-3 font-heading text-lg font-semibold">
            Возможности роста
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.opportunities.map((card) => (
              <Card key={card.id} data-testid={card.testId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{card.title}</CardTitle>
                  <CardDescription>{card.body}</CardDescription>
                </CardHeader>
                {card.href ? (
                  <CardContent>
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={card.href} />}
                    >
                      Открыть
                    </Button>
                  </CardContent>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
