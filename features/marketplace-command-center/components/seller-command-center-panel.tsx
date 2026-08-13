"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

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
import type { SellerCommandCenterDashboard } from "@/lib/marketplace-command-center/types";

type SellerCommandCenterPanelProps = {
  data: SellerCommandCenterDashboard;
};

export function SellerCommandCenterPanel({ data }: SellerCommandCenterPanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.COMMAND_CENTER_VIEW,
      route: ROUTES.ACCOUNT_COMMAND_CENTER,
    });
    if (data.nextAction) {
      trackEvent({
        event: ANALYTICS_EVENTS.PRIORITY_VIEW,
        route: ROUTES.ACCOUNT_COMMAND_CENTER,
        entityId: data.nextAction.id,
      });
    }
  }, [data.enabled, data.nextAction]);

  if (!data.enabled) {
    return (
      <Card data-testid="seller-command-center-panel">
        <CardHeader>
          <CardTitle>{data.title}</CardTitle>
          <CardDescription>MARKETPLACE_COMMAND_CENTER_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function onFixClick() {
    trackEvent({
      event: ANALYTICS_EVENTS.PRIORITY_ACTION_CLICK,
      route: ROUTES.ACCOUNT_COMMAND_CENTER,
      entityId: data.nextAction?.id,
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-command-center-panel">
      <section data-testid="cc-seller-health">
        <div className="mb-3 flex items-center gap-2">
          <LayoutDashboard className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Seller Health</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard label="Growth Score" value={data.health.growthScore} />
          <ScoreCard label="Trust Score" value={data.health.trustScore} />
          <ScoreCard label="Quality Score" value={data.health.qualityScore} />
          <ScoreCard label="Learning score" value={data.health.learningScore} />
        </div>
      </section>

      <section data-testid="cc-ai-summary">
        <h3 className="mb-2 font-heading text-lg font-semibold">AI Summary</h3>
        <p className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
          {data.aiSummary}
        </p>
      </section>

      {data.nextAction ? (
        <section data-testid="cc-next-action">
          <h3 className="mb-2 font-heading text-lg font-semibold">
            ONE NEXT ACTION
          </h3>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{data.nextAction.title}</CardTitle>
              <CardDescription>{data.nextAction.source.replace(/_/g, " ")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Причина: </span>
                {data.nextAction.why}
              </p>
              <p>
                <span className="font-medium">Impact: </span>
                {data.nextAction.impact}
              </p>
              <p>
                <span className="font-medium">Как исправить: </span>
                {data.nextAction.howTo}
              </p>
              {data.nextAction.href ? (
                <Button
                  size="sm"
                  className="mt-2"
                  nativeButton={false}
                  render={
                    <Link href={data.nextAction.href} onClick={onFixClick} />
                  }
                >
                  Исправить
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {data.opportunities.length > 0 ? (
        <section data-testid="cc-opportunities">
          <h3 className="mb-3 font-heading text-lg font-semibold">Opportunities</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.opportunities.map((widget) => (
              <Card key={widget.id} data-testid={widget.testId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{widget.title}</CardTitle>
                  <CardDescription>{widget.body}</CardDescription>
                </CardHeader>
                {widget.href ? (
                  <CardContent>
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={widget.href} />}
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

      {data.whatWorks.length > 0 ? (
        <section data-testid="cc-what-works">
          <h3 className="mb-3 font-heading text-lg font-semibold">What works</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.whatWorks.map((widget) => (
              <Card key={widget.id} data-testid={widget.testId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{widget.title}</CardTitle>
                  <CardDescription>{widget.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ScoreCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">
          {value != null ? `${value}/100` : "—"}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
