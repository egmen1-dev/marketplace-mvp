"use client";

import { useEffect, useState, useTransition } from "react";
import { BookOpen, ListChecks, MessageSquareText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  toggleEducationContentAction,
  updateEducationContentDescriptionAction,
  updateEducationContentPriorityAction,
} from "@/lib/marketplace-education/actions";
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
  const [pending, startTransition] = useTransition();
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.EDUCATION_VIEW,
      route: ROUTES.ADMIN_EDUCATION,
    });
  }, []);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-marketplace-education-panel">
        <CardHeader>
          <CardTitle>Education Layer выключен</CardTitle>
          <CardDescription>MARKETPLACE_EDUCATION_ENABLED=false</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Контент-реестр доступен для preview: {data.content.length} items
        </CardContent>
      </Card>
    );
  }

  function toggle(contentId: string, enabled: boolean) {
    startTransition(async () => {
      const result = await toggleEducationContentAction(contentId, enabled);
      if (!result.ok && result.error) window.alert(result.error);
    });
  }

  function savePriority(contentId: string, value: string) {
    const priority = Number(value);
    if (!Number.isFinite(priority)) return;
    startTransition(async () => {
      const result = await updateEducationContentPriorityAction(
        contentId,
        priority,
      );
      if (!result.ok && result.error) window.alert(result.error);
    });
  }

  function saveDescription(contentId: string) {
    const description = edits[contentId];
    if (!description?.trim()) return;
    startTransition(async () => {
      const result = await updateEducationContentDescriptionAction(
        contentId,
        description.trim(),
      );
      if (!result.ok && result.error) window.alert(result.error);
    });
  }

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="admin-marketplace-education-panel"
    >
      <section data-testid="education-content-cms">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">Content CMS</h3>
        </div>
        <ul className="space-y-3">
          {data.content.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border px-4 py-3"
              data-testid={`education-content-${item.id}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.title}</span>
                <Badge variant="outline">{item.type}</Badge>
                <Badge variant="secondary">{item.audience}</Badge>
                <Badge variant={item.enabled ? "default" : "outline"}>
                  {item.enabled ? "on" : "off"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  priority {item.priority}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => toggle(item.id, !item.enabled)}
                >
                  {item.enabled ? "Выключить" : "Включить"}
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={item.priority}
                    className="h-8 w-20"
                    aria-label={`Priority ${item.id}`}
                    onBlur={(e) => savePriority(item.id, e.target.value)}
                  />
                </div>
                <Input
                  className="h-8 min-w-[220px] flex-1"
                  placeholder="Редактировать описание"
                  value={edits[item.id] ?? item.description}
                  onChange={(e) =>
                    setEdits((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                />
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => saveDescription(item.id)}
                >
                  Сохранить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

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
                {guide.steps.length} steps
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
