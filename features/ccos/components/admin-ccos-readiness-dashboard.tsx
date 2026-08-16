"use client";

import { Check, Circle, Minus, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  CcosReadinessDashboard,
  DependencyAuditReport,
  ReadinessStatus,
} from "@/lib/ccos/rc/types";

type AdminCcosReadinessDashboardProps = {
  dashboard: CcosReadinessDashboard;
  dependencyAudit: DependencyAuditReport;
};

function StatusIcon({ status }: { status: ReadinessStatus }) {
  if (status === "ready") return <Check className="h-4 w-4 text-emerald-600" />;
  if (status === "stub") return <Circle className="h-4 w-4 text-blue-500" />;
  if (status === "disabled") return <Minus className="h-4 w-4 text-muted-foreground" />;
  return <AlertTriangle className="h-4 w-4 text-amber-500" />;
}

function statusLabel(status: ReadinessStatus): string {
  if (status === "ready") return "Ready";
  if (status === "stub") return "Stub";
  if (status === "disabled") return "Off";
  return "Pending";
}

export function AdminCcosReadinessDashboard({
  dashboard,
  dependencyAudit,
}: AdminCcosReadinessDashboardProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="admin-ccos-readiness-dashboard">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={dashboard.releaseCandidateReady ? "default" : "secondary"}>
          RC-1 {dashboard.releaseCandidateReady ? "READY FOR WAVE 6 GATE" : "IN PROGRESS"}
        </Badge>
        <Badge variant={dependencyAudit.passed ? "default" : "destructive"}>
          Cycles: {dependencyAudit.passed ? "PASS" : "FAIL"}
        </Badge>
        <Badge variant={dependencyAudit.architectureClean ? "default" : "secondary"}>
          Architecture: {dependencyAudit.architectureClean ? "CLEAN" : "DEBT"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {dependencyAudit.summary.cycleCount} cycles · {dependencyAudit.summary.violationCount}{" "}
          marketplace imports in lib/ccos · {dependencyAudit.summary.edgeCount} layer edges
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CCOS Platform Readiness</CardTitle>
          <CardDescription>Release Candidate Freeze — no new features, audit only</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {dashboard.rows.map((row) => (
              <li
                key={row.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <StatusIcon status={row.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{row.label}</span>
                    <Badge variant="outline">{statusLabel(row.status)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{row.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dependency Map</CardTitle>
          <CardDescription>Expected stack before Evolution (Wave 6)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
            {dependencyAudit.layerStack.join("\n")}
          </pre>

          {dependencyAudit.cycles.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Circular dependencies</p>
              <ul className="mt-2 list-disc pl-5">
                {dependencyAudit.cycles.map((cycle, i) => (
                  <li key={i}>{cycle.join(" → ")}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-emerald-700">No circular module dependencies detected.</p>
          )}

          {dependencyAudit.marketplaceViolations.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              <p className="font-medium">Marketplace imports inside lib/ccos (resolve before Wave 6)</p>
              <ul className="mt-2 max-h-48 overflow-y-auto text-xs">
                {dependencyAudit.marketplaceViolations.slice(0, 12).map((v) => (
                  <li key={`${v.file}:${v.importPath}`} className="font-mono">
                    {v.file} → {v.importPath}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium">Module edges (lib/ccos)</p>
            <ul className="grid gap-1 text-xs font-mono sm:grid-cols-2">
              {dependencyAudit.edges.map((e) => (
                <li key={`${e.from}-${e.to}`}>
                  {e.from} → {e.to}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
