"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Command } from "lucide-react";

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
import type { AdminCommandCenterDashboard } from "@/lib/marketplace-command-center/types";

type AdminCommandCenterPanelProps = {
  data: AdminCommandCenterDashboard;
};

export function AdminCommandCenterPanel({
  data,
}: AdminCommandCenterPanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.COMMAND_CENTER_VIEW,
      route: ROUTES.ADMIN_COMMAND_CENTER,
    });
    if (data.topPriorities[0]) {
      trackEvent({
        event: ANALYTICS_EVENTS.PRIORITY_VIEW,
        route: ROUTES.ADMIN_COMMAND_CENTER,
        entityId: data.topPriorities[0].id,
      });
    }
  }, [data.enabled, data.topPriorities]);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-command-center-panel">
        <CardHeader>
          <CardTitle>Command Center</CardTitle>
          <CardDescription>MARKETPLACE_COMMAND_CENTER_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-command-center-panel">
      <WidgetSection
        title="Marketplace Health"
        testId="cc-admin-health"
        widgets={data.marketplaceHealth}
      />

      <section data-testid="cc-admin-priorities">
        <div className="mb-3 flex items-center gap-2">
          <Command className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">AI Priorities (TOP-5)</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {data.aiPriorities.map((priority) => (
            <Card key={priority.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{priority.title}</CardTitle>
                <CardDescription>
                  {priority.source} · {priority.urgency}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{priority.why}</p>
                {priority.href ? (
                  <Link
                    href={priority.href}
                    className="mt-2 inline-block text-primary underline-offset-4 hover:underline"
                  >
                    Открыть
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <WidgetSection
        title="Execution Status"
        testId="cc-admin-execution"
        widgets={data.executionStatus}
      />
      <WidgetSection title="Learning" testId="cc-admin-learning" widgets={data.learning} />
      <WidgetSection title="Trust" testId="cc-admin-trust" widgets={data.trust} />
      <WidgetSection
        title="Revenue Opportunities"
        testId="cc-admin-revenue"
        widgets={data.revenueOpportunities}
      />
    </div>
  );
}

function WidgetSection({
  title,
  testId,
  widgets,
}: {
  title: string;
  testId: string;
  widgets: Array<{
    id: string;
    title: string;
    body: string;
    badge?: string;
    href?: string;
    testId: string;
  }>;
}) {
  return (
    <section data-testid={testId}>
      <h3 className="mb-3 font-heading text-lg font-semibold">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {widgets.map((widget) => (
          <Card key={widget.id} data-testid={widget.testId}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{widget.title}</span>
                {widget.badge ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {widget.badge}
                  </span>
                ) : null}
              </CardTitle>
              <CardDescription>{widget.body}</CardDescription>
            </CardHeader>
            {widget.href ? (
              <CardContent>
                <Link
                  href={widget.href}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Открыть
                </Link>
              </CardContent>
            ) : null}
          </Card>
        ))}
        {widgets.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Нет данных
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
