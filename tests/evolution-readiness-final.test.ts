import { describe, expect, it } from "vitest";

import { runCcosDependencyAudit } from "@/lib/ccos/rc";
import { buildEvolutionReadinessReport } from "@/lib/ccos/evolution/readiness";
import { bootstrapVerifiedVersions, isRollbackFoundationReady } from "@/lib/ccos/rollback";

describe("evolution readiness final gate", () => {
  it("reports rollbackAvailable true when foundation ready", () => {
    bootstrapVerifiedVersions();
    expect(isRollbackFoundationReady()).toBe(true);

    const audit = runCcosDependencyAudit();
    const report = buildEvolutionReadinessReport({
      dependencyAudit: audit,
      graphAccepted: true,
      twinAccepted: true,
    });

    expect(report.checks.rollbackAvailable).toBe(true);
    expect(report.checks.dependencyClean).toBe(true);
    expect(report.ready).toBe(true);
    expect(report.productionPromotionDisabled).toBe(true);
  });
});
