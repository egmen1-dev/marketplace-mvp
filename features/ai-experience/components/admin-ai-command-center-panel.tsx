"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Brain, ClipboardCheck, LineChart, Target } from "lucide-react";

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
import type { AdminAiCommandCenterDashboard } from "@/lib/ai-experience/types";

type AdminAiCommandCenterPanelProps = {
  data: AdminAiCommandCenterDashboard;
};

export function AdminAiCommandCenterPanel({
  data,
}: AdminAiCommandCenterPanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.AI_CENTER_VIEW,
      route: ROUTES.ADMIN_AI_CENTER,
    });
  }, [data.enabled]);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-ai-command-center-panel">
        <CardHeader>
          <CardTitle>AI Command Center выключен</CardTitle>
          <CardDescription>AI_EXPERIENCE_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="admin-ai-command-center-panel"
    >
      <Section
        icon={LineChart}
        title="Marketplace health"
        testId="ai-admin-health"
        cards={data.marketplaceHealth}
      />
      <Section
        icon={Target}
        title="Top opportunities"
        testId="ai-admin-opportunities"
        cards={data.topOpportunities}
      />
      <Section
        icon={Brain}
        title="Active strategies"
        testId="ai-admin-strategies"
        cards={data.activeStrategies}
      />
      <Section
        icon={ClipboardCheck}
        title="Execution progress"
        testId="ai-admin-execution"
        cards={data.executionProgress}
      />
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  testId,
  cards,
}: {
  icon: typeof LineChart;
  title: string;
  testId: string;
  cards: AdminAiCommandCenterDashboard["marketplaceHealth"];
}) {
  return (
    <section data-testid={testId}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-5 text-primary" aria-hidden />
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
      </div>
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет данных — включите слой intelligence</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {cards.map((card) => (
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
                    Подробнее
                  </Button>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
