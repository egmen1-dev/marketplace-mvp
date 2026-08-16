"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { CognitiveBrainVersion } from "@/lib/ccos/evolution/types";

type EvolutionDashboardProps = {
  health: {
    enabled: boolean;
    currentBundle: {
      brainVersion: string;
      knowledgePackVersion: string;
      graphVersion: string;
    };
    rollbackTarget: string | null;
    pendingCandidate: { id: string; version: string; status: string; riskTier?: string } | null;
  };
  candidates: CognitiveBrainVersion[];
};

export function AdminCcosEvolutionDashboard({ health, candidates }: EvolutionDashboardProps) {
  const pending = candidates.find((c) => ["CANDIDATE", "VALIDATING", "APPROVED"].includes(c.status));

  return (
    <div className="flex flex-col gap-4" data-testid="admin-ccos-evolution-dashboard">
      <div className="flex flex-wrap gap-2">
        <Badge variant={health.enabled ? "default" : "secondary"}>
          Evolution {health.enabled ? "ON" : "OFF"}
        </Badge>
        <Badge variant="outline">Current: {health.currentBundle.brainVersion}</Badge>
        <Badge variant="outline">Rollback: {health.rollbackTarget ?? "n/a"}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Production Bundle</CardTitle>
            <CardDescription>Active cognitive version bundle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Brain: {health.currentBundle.brainVersion}</p>
            <p>Knowledge: {health.currentBundle.knowledgePackVersion}</p>
            <p>Graph: {health.currentBundle.graphVersion}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Candidate Pipeline</CardTitle>
            <CardDescription>Hidden from seller until promoted</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pending ? (
              <>
                <p className="font-medium">{pending.version}</p>
                <p>Status: {pending.status}</p>
                <p>Risk: {pending.riskTier ?? "n/a"}</p>
                {pending.validationResults ? (
                  <p>Validation: {pending.validationResults.passed ? "PASS" : "FAIL"}</p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">No active candidate</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
