import { Check, Circle, XCircle } from "lucide-react";

import type { LaunchAuditCheck } from "@/lib/marketplace-launch-readiness/types";

type LaunchChecksListProps = {
  checks: LaunchAuditCheck[];
  testId?: string;
};

export function LaunchChecksList({ checks, testId }: LaunchChecksListProps) {
  return (
    <ul className="space-y-2 text-sm" data-testid={testId}>
      {checks.map((check) => (
        <li key={check.id} className="flex items-start gap-2">
          {check.passed ? (
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
          ) : check.severity === "critical" ? (
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          ) : (
            <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <span>
            {check.label}
            {check.detail ? (
              <span className="block text-xs text-muted-foreground">{check.detail}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
