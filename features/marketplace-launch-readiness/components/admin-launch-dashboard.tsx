"use client";

import { useEffect, useTransition } from "react";
import { Check, Circle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trackLaunchAuditViewAction } from "@/lib/marketplace-launch-readiness/actions";
import type {
  LaunchChecklistReport,
  LaunchReadinessReport,
} from "@/lib/marketplace-launch-readiness/types";
import { LaunchChecksList } from "@/features/marketplace-launch-readiness/components/launch-checks-list";

type AdminLaunchDashboardProps = {
  report: LaunchReadinessReport;
  checklist: LaunchChecklistReport;
};

const SECTION_LABELS: Record<string, string> = {
  technical: "Technical",
  marketplace: "Marketplace",
  trust: "Trust",
};

export function AdminLaunchDashboard({
  report,
  checklist,
}: AdminLaunchDashboardProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!report.enabled) return;
    startTransition(() => {
      void trackLaunchAuditViewAction();
    });
  }, [report.enabled]);

  if (!report.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_LAUNCH_READINESS_ENABLED=false
      </p>
    );
  }

  const scoreTone =
    report.label === "launch_ready"
      ? "text-emerald-600"
      : report.label === "gaps"
        ? "text-amber-600"
        : "text-destructive";

  const sections = ["technical", "marketplace", "trust"] as const;

  return (
    <div className="flex flex-col gap-6" data-testid="admin-launch-dashboard">
      <Card>
        <CardHeader>
          <CardTitle>Launch readiness</CardTitle>
          <CardDescription>{report.headline}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className={`font-heading text-4xl font-semibold tabular-nums ${scoreTone}`}>
            {report.score}/100
          </p>
        </CardContent>
      </Card>

      {report.failedCritical.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Critical blockers</CardTitle>
          </CardHeader>
          <CardContent>
            <LaunchChecksList checks={report.failedCritical} />
          </CardContent>
        </Card>
      ) : null}

      {report.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {section.title} · {section.score}/100
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LaunchChecksList checks={section.checks} />
          </CardContent>
        </Card>
      ))}

      <Card data-testid="launch-checklist">
        <CardHeader>
          <CardTitle className="text-base">
            Launch checklist · {checklist.readyCount}/{checklist.totalCount}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sections.map((section) => (
            <div key={section}>
              <p className="mb-2 text-sm font-medium">{SECTION_LABELS[section]}</p>
              <ul className="space-y-2 text-sm">
                {checklist.items
                  .filter((item) => item.section === section)
                  .map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      {item.ready ? (
                        <Check className="mt-0.5 size-4 text-primary" />
                      ) : (
                        <Circle className="mt-0.5 size-4 text-muted-foreground" />
                      )}
                      <span>
                        {item.label}
                        {item.detail ? (
                          <span className="block text-xs text-muted-foreground">
                            {item.detail}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
