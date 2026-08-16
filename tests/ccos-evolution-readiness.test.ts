import { describe, expect, it } from "vitest";

import { buildEvolutionReadinessReport } from "@/lib/ccos/evolution/readiness";
import { runCcosDependencyAudit } from "@/lib/ccos/rc";
import { createShadowEvaluationStub } from "@/lib/ccos/evolution/contracts";

describe("ccos evolution readiness foundation", () => {
  it("reports dependency clean after port extraction", () => {
    const audit = runCcosDependencyAudit();
    const report = buildEvolutionReadinessReport({
      graphAccepted: true,
      twinAccepted: true,
      dependencyAudit: audit,
    });
    expect(audit.architectureClean).toBe(true);
    expect(report.checks.dependencyClean).toBe(true);
  });

  it("keeps production promotion disabled", () => {
    const report = buildEvolutionReadinessReport({ dependencyAudit: runCcosDependencyAudit() });
    expect(report.productionPromotionDisabled).toBe(true);
    expect(report.ready).toBe(report.checkList.every((c) => c.ok));
  });

  it("exposes version pointers for brain/graph/knowledge rollback", () => {
    const report = buildEvolutionReadinessReport({ dependencyAudit: runCcosDependencyAudit() });
    expect(report.versionPointers.brain.current).toBeTruthy();
    expect(report.versionPointers.knowledge.current).toBeTruthy();
    expect(report.versionPointers.graph.current).toBeTruthy();
  });

  it("provides shadow evaluation contract stub", () => {
    const stub = createShadowEvaluationStub({
      currentBrainVersion: "marketplace-brain-v5-twin",
      candidateBrainVersion: "candidate-brain-v-next",
      entityId: "product-1",
      observations: [],
    });
    expect(stub.contractVersion).toBe("shadow-evaluation-v1");
    expect(stub.status).toBe("STUB");
    expect(stub.advisoryOnly).toBe(true);
  });

  it("includes human approval foundation flag", () => {
    const report = buildEvolutionReadinessReport({ dependencyAudit: runCcosDependencyAudit() });
    expect(report.humanApprovalFoundation).toBe(true);
    expect(report.checks.humanApprovalFoundation).toBe(true);
  });
});
