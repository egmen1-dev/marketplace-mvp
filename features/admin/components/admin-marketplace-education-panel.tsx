"use client";

import { useEffect } from "react";
import { BookOpen, ListChecks, MessageSquareText } from "lucide-react";

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
import type { MarketplaceEducationDashboard } from "@/lib/marketplace-education/types";

type AdminMarketplaceEducationPanelProps = {
  data: MarketplaceEducationDashboard;
};

export function AdminMarketplaceEducationPanel({
  data,
}: AdminMarketplaceEducationPanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.EDUCATION_VIEW,
      route: ROUTES.ADMIN_EDUCATION,
    });
  }, [data.enabled]);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-marketplace-education-panel">
        <CardHeader>
          <CardTitle>Education Layer выключен</CardTitle>
          <CardDescription>MARKETPLACE_EDUCATION_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="admin-marketplace-education-panel"
    >
      <section data-testid="education-guides">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Guides</h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.guides.map((guide) => (
            <Card key={guide.id} data-testid={`education-guide-${guide.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{guide.title}</CardTitle>
                <CardDescription>
                  {guide.target} · {guide.context} · priority {guide.priority}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {guide.steps.length} steps · {guide.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section data-testid="education-tooltips">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquareText className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Tooltips</h3>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.tooltips.map((tip) => (
            <li
              key={tip.id}
              className="rounded-lg border border-border px-3 py-2 text-sm"
              data-testid={`education-tooltip-row-${tip.id}`}
            >
              <span className="font-medium">{tip.label}</span> — {tip.title}
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="education-onboarding-steps">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Onboarding steps</h3>
        </div>
        {data.checklists.map((checklist) => (
          <Card key={checklist.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{checklist.title}</CardTitle>
              <CardDescription>
                {checklist.completedCount}/{checklist.totalCount} completed (sample)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {checklist.items.map((item) => (
                  <li key={item.id}>
                    {item.title}
                    {item.completed ? " ✓" : ""}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
