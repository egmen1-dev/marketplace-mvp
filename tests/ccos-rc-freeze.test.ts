import { describe, expect, it } from "vitest";

import { runCcosDependencyAudit } from "@/lib/ccos/rc/dependency-audit";
import { buildCcosReadinessDashboard } from "@/lib/ccos/rc/readiness-dashboard";
import { buildMobileBootstrapPayload } from "@/lib/mobile/bootstrap";
import { buildMobileClientConfig } from "@/lib/mobile/client-config";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";

describe("ccos rc-1 freeze", () => {
  it("builds dependency audit with layer edges and no cycles", () => {
    const audit = runCcosDependencyAudit();
    expect(audit.rcVersion).toBe("rc-1");
    expect(audit.modules.length).toBeGreaterThan(5);
    expect(audit.summary.edgeCount).toBeGreaterThan(0);
    expect(audit.cycles).toHaveLength(0);
    expect(audit.passed).toBe(true);
  });

  it("reports zero marketplace imports inside lib/ccos after port extraction", () => {
    const audit = runCcosDependencyAudit();
    expect(audit.summary.violationCount).toBe(0);
    expect(audit.architectureClean).toBe(true);
    expect(audit.passed).toBe(true);
  });

  it("builds readiness dashboard rows for core platform", () => {
    process.env.CCOS_ENABLED = "true";
    process.env.CCOS_GRAPH_PLATFORM_ENABLED = "true";
    process.env.CCOS_TWIN_PLATFORM_ENABLED = "true";
    process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED = "true";

    const dashboard = buildCcosReadinessDashboard();
    expect(dashboard.rows.some((r) => r.id === "graph" && r.status === "ready")).toBe(true);
    expect(dashboard.rows.some((r) => r.id === "evolution" && r.status === "pending")).toBe(true);
    expect(dashboard.rows.some((r) => r.id === "daos" && r.status === "stub")).toBe(true);
  });

  it("exposes mobile bootstrap entrypoint payload", () => {
    process.env.CCOS_ENABLED = "true";
    const bootstrap = buildMobileBootstrapPayload();
    expect(bootstrap.apiVersion).toBeTruthy();
    expect(bootstrap.endpoints.dashboard).toBe("/api/mobile/dashboard");
    expect(bootstrap.recommendedSyncIntervalSec).toBeGreaterThan(0);
    expect(bootstrap.brainCapabilities.recommend).toBe(true);
    expect(bootstrap.advisoryOnly).toBe(true);
  });

  it("exposes mobile client config with module versions", () => {
    process.env.CCOS_ENABLED = "true";
    process.env.CCOS_GRAPH_PLATFORM_ENABLED = "true";
    const config = buildMobileClientConfig();
    expect(config.modules.graph.contractVersion).toBeTruthy();
    expect(config.supportedFeatures).toContain("mobile_dashboard");
    expect(config.releaseChannel).toMatch(/dev|staging|prod/);
  });

  it("includes bootstrap and config in release readiness checklist", () => {
    const report = runReleaseReadinessCheck();
    expect(report.checks.some((c) => c.id === "mobile_bootstrap_api")).toBe(true);
    expect(report.checks.some((c) => c.id === "mobile_config_api")).toBe(true);
  });
});
