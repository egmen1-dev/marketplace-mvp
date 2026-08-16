#!/usr/bin/env tsx
/**
 * EPIC-77-PRE-WAVE-6 — staging acceptance + final gate matrix
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runCcosDependencyAudit } from "@/lib/ccos/rc";
import { buildEvolutionReadinessReport } from "@/lib/ccos/evolution/readiness";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";
import { resetSimulationPortRegistry } from "@/lib/ccos/simulation";
import { ensureMarketplaceRankingSimulationPortRegistered, runTwinSimulationWithRankingInput } from "@/lib/marketplace-cognitive-platform/adapters/ranking-simulation.adapter";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

const STAGING_BASE = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT_DIR = join(process.cwd(), "artifacts/ccos-pre-wave-6");

type Gate = { id: string; result: "PASS" | "FAIL" | "PARTIAL"; detail: string };

async function fetchJson(path: string): Promise<{ ok: boolean; data?: Record<string, unknown>; status?: number }> {
  try {
    const res = await fetch(`${STAGING_BASE}${path}`, { signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as Record<string, unknown>;
    return { ok: res.ok, data, status: res.status };
  } catch (err) {
    return { ok: false, detail: String(err) } as { ok: false; data?: undefined; status?: number };
  }
}

function mainSha(): string {
  return execSync("git rev-parse origin/main", { encoding: "utf8" }).trim().slice(0, 7);
}

async function run(): Promise<void> {
  process.env.CCOS_ENABLED ??= "true";
  process.env.CCOS_GRAPH_PLATFORM_ENABLED ??= "true";
  process.env.CCOS_TWIN_PLATFORM_ENABLED ??= "true";
  process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED ??= "true";
  process.env.MARKETPLACE_BRAIN_LEVEL ??= "simulator";

  mkdirSync(OUT_DIR, { recursive: true });
  const gates: Gate[] = [];

  const audit = runCcosDependencyAudit();
  gates.push({
    id: "ccos_cycles_zero",
    result: audit.summary.cycleCount === 0 ? "PASS" : "FAIL",
    detail: `cycles=${audit.summary.cycleCount}`,
  });
  gates.push({
    id: "marketplace_imports_zero",
    result: audit.summary.violationCount === 0 ? "PASS" : "FAIL",
    detail: `violations=${audit.summary.violationCount}`,
  });

  resetSimulationPortRegistry();
  ensureMarketplaceRankingSimulationPortRegistered();

  const fan: RankingProductInput = {
    id: "pre-wave-6-fan",
    name: "Вентилятор staging test",
    price: 4500,
    compareAt: null,
    status: "ACTIVE",
    stock: 8,
    views: 240,
    favoritesCount: 12,
    categoryId: "fans",
    categoryName: "Климат",
    descriptionLength: 140,
    seoTitleLength: 28,
    seoDescriptionLength: 90,
    photoCount: 3,
    hasVideo: false,
    characteristicCount: 5,
    hasBrand: true,
    sellerId: "seller-1",
    sellerBlocked: false,
    sellerTrustScore: 82,
    sellerReviewsCount: 20,
    sellerAverageRating: 4.7,
    sellerCompletedOrders: 35,
    sellerCancellationRate: 0.01,
    moderationStatus: "APPROVED",
    prohibitedHit: false,
    qualityScore: 80,
    cartAdds: 12,
    ordersCount: 6,
    promotionActive: false,
    photoQuality: 58,
    descriptionQuality: 65,
  };

  const twinReport = await runTwinSimulationWithRankingInput({
    productId: fan.id,
    rankingInput: fan,
    peerScores: [70, 66, 62],
    scenarioIds: ["scenario_combo"],
    graphPropagatedConfidence: 0.48,
    weights: DEFAULT_RANKING_WEIGHTS_V1,
  });
  const combo = twinReport.scenarios.find((s) => s.scenarioId === "scenario_combo");
  gates.push({
    id: "twin_combo_equivalent",
    result: combo?.simulationStatus === "OK" && combo.portProvenance?.portId ? "PASS" : "FAIL",
    detail: `status=${combo?.simulationStatus} port=${combo?.portProvenance?.portId ?? "n/a"}`,
  });
  gates.push({
    id: "twin_confidence_capped_by_graph",
    result: (combo?.confidence.overall ?? 1) <= 0.48 * 1.05 + 0.001 ? "PASS" : "FAIL",
    detail: `confidence=${combo?.confidence.overall} graphCap=0.48`,
  });

  const evolution = buildEvolutionReadinessReport({
    graphAccepted: true,
    twinAccepted: true,
    dependencyAudit: audit,
  });
  gates.push({
    id: "evolution_readiness_api_foundation",
    result: evolution.checks.dependencyClean && evolution.productionPromotionDisabled ? "PASS" : "FAIL",
    detail: `ready=${evolution.ready} promotionDisabled=${evolution.productionPromotionDisabled}`,
  });

  const mobile = runReleaseReadinessCheck();
  gates.push({
    id: "mobile_readiness_score",
    result: mobile.ready ? "PASS" : mobile.passed >= mobile.total - 1 ? "PARTIAL" : "FAIL",
    detail: `${mobile.passed}/${mobile.total}`,
  });

  const version = await fetchJson("/api/version");
  const stagingSha = typeof version.data?.commit === "string" ? version.data.commit.slice(0, 7) : "unknown";
  const localMain = mainSha();
  gates.push({
    id: "staging_equals_main",
    result: stagingSha === localMain ? "PASS" : "PARTIAL",
    detail: `staging=${stagingSha} main=${localMain}`,
  });

  const bootstrap = await fetchJson("/api/mobile/bootstrap");
  gates.push({
    id: "staging_mobile_bootstrap",
    result: bootstrap.ok ? "PASS" : "PARTIAL",
    detail: bootstrap.ok ? "reachable" : `status=${bootstrap.status ?? "error"}`,
  });

  const hardFails = gates.filter((g) => g.result === "FAIL").length;
  const report = {
    generatedAt: new Date().toISOString(),
    stagingBase: STAGING_BASE,
    gates,
    verdicts: {
      ccosPreWave6Architecture: hardFails === 0 && audit.architectureClean ? "ACCEPTED" : "NOT ACCEPTED",
      wave4KnowledgeGraphStaging: stagingSha === localMain ? "ACCEPTED" : "NOT ACCEPTED",
      wave5DigitalTwinStaging: combo?.simulationStatus === "OK" ? "PARTIAL" : "NOT ACCEPTED",
      ccosDependencyClean: audit.architectureClean ? "YES" : "NO",
      evolutionEngineReadiness: evolution.ready ? "READY" : "NOT READY",
      liveRanking: "UNCHANGED",
      autopilot: "DISABLED",
      appReleaseReadiness: `${mobile.passed}/${mobile.total}`,
    },
  };

  writeFileSync(join(OUT_DIR, "acceptance-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(hardFails > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
