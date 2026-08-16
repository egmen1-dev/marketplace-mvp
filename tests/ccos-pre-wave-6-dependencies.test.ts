import { describe, expect, it } from "vitest";

import { runCcosDependencyAudit } from "@/lib/ccos/rc";
import { classifyDependencyLayers } from "@/lib/ccos/rc/dependency-layers";

describe("ccos pre-wave-6 dependency clean gate", () => {
  it("reports zero marketplace imports inside lib/ccos", () => {
    const audit = runCcosDependencyAudit();
    expect(audit.summary.violationCount).toBe(0);
    expect(audit.marketplaceViolations).toHaveLength(0);
    expect(audit.architectureClean).toBe(true);
  });

  it("reports zero cyclic dependencies", () => {
    const audit = runCcosDependencyAudit();
    expect(audit.summary.cycleCount).toBe(0);
    expect(audit.cycles).toHaveLength(0);
    expect(audit.passed).toBe(true);
  });

  it("classifies dependency layers with forbidden edge analysis", () => {
    const audit = runCcosDependencyAudit();
    const layers = classifyDependencyLayers(audit);
    expect(layers.layers.length).toBeGreaterThanOrEqual(5);
    expect(layers.forbiddenViolations).toHaveLength(0);
    expect(layers.moduleLayer.twin).toBe("ccos_core");
    expect(layers.moduleLayer.simulation).toBe("ccos_core");
  });

  it("includes layer analysis in audit report v2", () => {
    const audit = runCcosDependencyAudit();
    expect(audit.layerAnalysis).toBeDefined();
    expect(audit.summary.forbiddenEdgeCount).toBe(0);
  });
});
