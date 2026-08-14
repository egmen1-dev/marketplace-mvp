"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Circle, ShieldCheck, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { trackFoundationAuditViewAction } from "@/lib/marketplace-foundation-audit/actions";
import type { MarketplaceFoundationReport } from "@/lib/marketplace-foundation-audit/types";

type AdminFoundationDashboardProps = {
  report: MarketplaceFoundationReport;
};

export function AdminFoundationDashboard({ report }: AdminFoundationDashboardProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!report.enabled) return;
    startTransition(() => {
      void trackFoundationAuditViewAction();
    });
  }, [report.enabled]);

  if (!report.enabled) {
    return (
      <Card data-testid="admin-foundation-dashboard">
        <CardHeader>
          <CardTitle>Marketplace Foundation</CardTitle>
          <CardDescription>MARKETPLACE_FOUNDATION_AUDIT_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const scoreTone =
    report.score.label === "ready"
      ? "text-emerald-600"
      : report.score.label === "gaps"
        ? "text-amber-600"
        : "text-destructive";

  return (
    <div className="flex flex-col gap-6" data-testid="admin-foundation-dashboard">
      <Card data-testid="foundation-health-score">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Marketplace Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`font-heading text-4xl font-semibold tabular-nums ${scoreTone}`}>
            {report.score.total}/100
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{report.score.headline}</p>
        </CardContent>
      </Card>

      {report.criticalIssues.length > 0 ? (
        <Card data-testid="foundation-critical-issues">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" />
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {report.criticalIssues.map((issue) => (
                <li key={issue.id} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span>{issue.title}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card data-testid="foundation-launch-checklist">
        <CardHeader>
          <CardTitle className="text-base">Launch Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {report.checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                {item.ready ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={item.ready ? "text-muted-foreground line-through" : undefined}>
                  {item.label}
                </span>
                {item.detail ? (
                  <Badge variant="secondary" className="ml-auto">
                    {item.detail}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="foundation-order-lifecycle">
        <CardHeader>
          <CardTitle className="text-base">Order Lifecycle Health</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{report.orderLifecycle.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {report.score.areas.map((area) => (
          <Card key={area.area} data-testid={`foundation-area-${area.area}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{area.title}</CardTitle>
              <CardDescription>
                Score: {area.score}/100 · Weight: {area.weight}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {area.checks.map((check) => (
                  <li key={check.id} className="flex items-start gap-2">
                    {check.passed ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    ) : (
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    )}
                    <span>
                      {check.label}
                      {check.detail ? (
                        <span className="block text-xs text-muted-foreground">
                          {check.detail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {report.recommendations.length > 0 ? (
        <Card data-testid="foundation-recommendations">
          <CardHeader>
            <CardTitle className="text-base">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {report.recommendations.map((rec) => (
              <article key={rec.id} className="rounded-xl border border-border p-4 text-sm">
                <p className="font-medium">Проблема: {rec.problem}</p>
                <p className="mt-1 text-muted-foreground">Причина: {rec.cause}</p>
                <p className="mt-1">Рекомендация: {rec.recommendation}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Link
        href={ROUTES.ADMIN_OPERATIONS}
        className="text-sm font-medium text-primary"
      >
        Открыть операционный обзор →
      </Link>
    </div>
  );
}
