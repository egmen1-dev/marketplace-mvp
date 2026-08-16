import { isCcosEnabled } from "@/lib/ccos/flags";
import { isCcosGraphPlatformEnabled } from "@/lib/ccos/graph/flags";
import { isCcosTwinPlatformEnabled } from "@/lib/ccos/twin/flags";
import { isCcosKnowledgePlatformEnabled } from "@/lib/ccos/knowledge/flags";
import { isCcosProductPlatformEnabled } from "@/lib/ccos/product/flags";
import { MARKETPLACE_BRAIN_MATURITY } from "@/lib/ccos/governance/maturity";
import { currentMarketplaceBrainVersion } from "@/lib/ccos/knowledge/versions";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";

import { runCcosDependencyAudit } from "./dependency-audit";
import type { CcosReadinessDashboard, ReadinessRow, ReadinessStatus } from "./types";

function row(id: string, label: string, status: ReadinessStatus, detail: string): ReadinessRow {
  return { id, label, status, detail };
}

export function buildCcosReadinessDashboard(): CcosReadinessDashboard {
  const audit = runCcosDependencyAudit();
  const mobile = runReleaseReadinessCheck();
  const ccosOn = isCcosEnabled();

  const rows: ReadinessRow[] = [
    row("ccos_core", "CCOS Core", ccosOn ? "ready" : "disabled", ccosOn ? "CCOS_ENABLED=true" : "CCOS disabled"),
    row(
      "observation",
      "Observation",
      ccosOn ? "ready" : "disabled",
      "Universal observation bus + publishers",
    ),
    row(
      "knowledge",
      "Knowledge",
      isCcosKnowledgePlatformEnabled() || process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true"
        ? "ready"
        : "pending",
      "Verified knowledge + evidence pipeline",
    ),
    row(
      "graph",
      "Graph",
      isCcosGraphPlatformEnabled() ? "ready" : "pending",
      "Causal Knowledge Graph Wave 4",
    ),
    row(
      "twin",
      "Twin",
      isCcosTwinPlatformEnabled() ? "ready" : "pending",
      "Digital Twin Wave 5",
    ),
    row(
      "brain",
      "Brain",
      process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true" ? "ready" : "pending",
      currentMarketplaceBrainVersion(),
    ),
    row(
      "marketplace",
      "Marketplace",
      process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true" ? "ready" : "pending",
      "Adapter layer + cognitive product report",
    ),
    row("daos", "DAOS", "stub", "Synthetic cross-app contract only"),
    row("quicksale", "QuickSale", "stub", "Synthetic cross-app contract only"),
    row("learning", "Learning", "pending", "Not in RC-1 scope"),
    row("evolution", "Evolution", "pending", "Wave 6 — blocked until RC pass"),
    row(
      "autopilot",
      "Autopilot",
      MARKETPLACE_BRAIN_MATURITY === "L4_AUTOPILOT" ? "ready" : "disabled",
      MARKETPLACE_BRAIN_MATURITY === "L4_AUTOPILOT" ? "L4 enabled — not allowed" : "L4 blocked (expected)",
    ),
    row(
      "android_api",
      "Android API",
      mobile.checks.some((c) => c.id === "mobile_dashboard_api" && c.ok) ? "ready" : "pending",
      "/api/mobile/bootstrap + /config + /dashboard",
    ),
    row(
      "offline_api",
      "Offline API",
      mobile.checks.some((c) => c.id === "mobile_graph_cache_api" && c.ok) ? "ready" : "pending",
      "/api/ccos/graph/cache",
    ),
    row(
      "product_genome",
      "Product Understanding",
      isCcosProductPlatformEnabled() ? "ready" : "pending",
      "Product Genome Wave 3",
    ),
  ];

  return {
    rcVersion: "rc-1",
    evaluatedAt: new Date().toISOString(),
    rows,
    dependencyAuditPassed: audit.passed && audit.architectureClean,
    dependencyCyclesClear: audit.passed,
    architectureClean: audit.architectureClean,
    releaseCandidateReady:
      audit.passed &&
      audit.architectureClean &&
      rows.filter((r) => ["graph", "twin", "brain", "marketplace"].includes(r.id)).every((r) => r.status === "ready") &&
      rows.find((r) => r.id === "evolution")?.status === "pending",
  };
}

export function getCcosReadinessWithAudit() {
  return {
    dashboard: buildCcosReadinessDashboard(),
    dependencyAudit: runCcosDependencyAudit(),
  };
}
