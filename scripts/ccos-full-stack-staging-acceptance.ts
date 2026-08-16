#!/usr/bin/env tsx
/**
 * EPIC-77-STACKED-MERGE-AND-STAGING-ACCEPTANCE-001
 * Full stack staging acceptance + mobile smoke + evolution readiness gate.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { runCcosDependencyAudit } from "@/lib/ccos/rc";
import { buildEvolutionReadinessReport } from "@/lib/ccos/evolution/readiness";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";
import { buildAppShellReadinessReport } from "@/lib/mobile/app-shell-readiness";
import { resetSimulationPortRegistry } from "@/lib/ccos/simulation";
import {
  ensureMarketplaceRankingSimulationPortRegistered,
  runTwinSimulationWithRankingInput,
} from "@/lib/marketplace-cognitive-platform/adapters/ranking-simulation.adapter";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

const STAGING_BASE = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT_DIR = join(process.cwd(), "artifacts/ccos-full-stack-staging");

type Gate = { id: string; result: "PASS" | "FAIL" | "PARTIAL" | "SKIP"; detail: string };

async function probe(path: string, init?: RequestInit): Promise<{
  ok: boolean;
  status: number;
  ms: number;
  bytes: number;
  json?: Record<string, unknown>;
}> {
  const start = performance.now();
  try {
    const res = await fetch(`${STAGING_BASE}${path}`, { ...init, signal: AbortSignal.timeout(12000) });
    const text = await res.text();
    const ms = Math.round(performance.now() - start);
    let json: Record<string, unknown> | undefined;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = undefined;
    }
    return { ok: res.ok, status: res.status, ms, bytes: text.length, json };
  } catch (err) {
    return { ok: false, status: 0, ms: Math.round(performance.now() - start), bytes: 0, json: { error: String(err) } };
  }
}

function mainSha(): string {
  return execSync("git rev-parse origin/main", { encoding: "utf8" }).trim().slice(0, 7);
}

async function run(): Promise<void> {
  process.env.CCOS_ENABLED ??= "true";
  process.env.CCOS_KNOWLEDGE_PLATFORM_ENABLED ??= "true";
  process.env.CCOS_PRODUCT_PLATFORM_ENABLED ??= "true";
  process.env.CCOS_GRAPH_PLATFORM_ENABLED ??= "true";
  process.env.CCOS_TWIN_PLATFORM_ENABLED ??= "true";
  process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED ??= "true";
  process.env.MARKETPLACE_BRAIN_LEVEL ??= "simulator";

  mkdirSync(OUT_DIR, { recursive: true });
  const gates: Gate[] = [];

  const audit = runCcosDependencyAudit();
  gates.push({ id: "dependency_clean", result: audit.architectureClean ? "PASS" : "FAIL", detail: `violations=${audit.summary.violationCount} cycles=${audit.summary.cycleCount}` });

  const version = await probe("/api/version");
  const stagingSha = typeof version.json?.commit === "string" ? version.json.commit.slice(0, 7) : "unknown";
  const localMain = mainSha();
  const mainEqualsStaging = stagingSha === localMain;
  gates.push({ id: "main_equals_staging", result: mainEqualsStaging ? "PASS" : "FAIL", detail: `staging=${stagingSha} main=${localMain}` });

  const health = await probe("/api/health");
  gates.push({ id: "health", result: health.ok ? "PASS" : "PARTIAL", detail: `status=${health.status}` });

  const mobileEndpoints = [
    "/api/mobile/bootstrap",
    "/api/mobile/config",
    "/api/mobile/readiness",
    "/api/mobile/navigation",
    "/api/mobile/android/update",
    "/api/mobile/deep-link/resolve?uri=lot%3A%2F%2Fhome",
  ];

  const mobileLatency: Record<string, { ms: number; bytes: number; ok: boolean }> = {};
  for (const path of mobileEndpoints) {
    const p = await probe(path);
    mobileLatency[path] = { ms: p.ms, bytes: p.bytes, ok: p.ok };
    gates.push({
      id: `mobile_${path.split("?")[0].replace(/\//g, "_")}`,
      result: p.ok ? "PASS" : mainEqualsStaging ? "FAIL" : "PARTIAL",
      detail: `${p.status} ${p.ms}ms ${p.bytes}B`,
    });
  }

  const authPost = await probe("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "status" }),
  });
  gates.push({
    id: "mobile_auth_session",
    result: authPost.ok ? "PASS" : mainEqualsStaging ? "FAIL" : "PARTIAL",
    detail: `${authPost.status} decision=${String(authPost.json?.decision ?? "n/a")}`,
  });

  resetSimulationPortRegistry();
  ensureMarketplaceRankingSimulationPortRegistered();
  const fan: RankingProductInput = {
    id: "stack-acceptance-fan",
    name: "Вентилятор acceptance",
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
    scenarioIds: ["scenario_photo", "scenario_price_3", "scenario_promotion", "scenario_combo"],
    graphPropagatedConfidence: 0.48,
    graphCoverage: 0.55,
    weights: DEFAULT_RANKING_WEIGHTS_V1,
  });
  const combo = twinReport.scenarios.find((s) => s.scenarioId === "scenario_combo");
  const graphConfidenceOk = (combo?.confidence.overall ?? 1) <= 0.48 * 1.05 + 0.001;
  gates.push({ id: "wave5_twin_local", result: combo?.simulationStatus === "OK" ? "PASS" : "FAIL", detail: `port=${combo?.portProvenance?.portId}` });
  gates.push({ id: "graph_twin_confidence", result: graphConfidenceOk ? "PASS" : "FAIL", detail: `twin=${combo?.confidence.overall} graphCap=0.48` });

  const wave4Accepted = mainEqualsStaging && health.ok;
  const wave5Accepted = wave4Accepted && combo?.simulationStatus === "OK" && graphConfidenceOk;

  const evolution = buildEvolutionReadinessReport({
    dependencyAudit: audit,
    graphAccepted: wave4Accepted,
    twinAccepted: wave5Accepted,
  });
  gates.push({
    id: "evolution_readiness_honest",
    result: evolution.ready ? "PASS" : "PARTIAL",
    detail: `ready=${evolution.ready} checks=${JSON.stringify(evolution.checks)}`,
  });

  const mobileLocal = runReleaseReadinessCheck();
  const appShell = buildAppShellReadinessReport();
  gates.push({ id: "mobile_readiness_local", result: mobileLocal.ready ? "PASS" : "PARTIAL", detail: `${mobileLocal.passed}/${mobileLocal.total}` });
  gates.push({ id: "app_shell_readiness", result: appShell.status === "YES" ? "PASS" : "PARTIAL", detail: appShell.status });

  const hardFails = gates.filter((g) => g.result === "FAIL").length;
  const fullStackAccepted = hardFails === 0 && mainEqualsStaging && wave4Accepted && wave5Accepted;

  const report = {
    generatedAt: new Date().toISOString(),
    stagingBase: STAGING_BASE,
    originMainSha: localMain,
    stagingSha,
    mobileLatency,
    gates,
    verdicts: {
      ccosFullStackStaging: fullStackAccepted ? "ACCEPTED" : "NOT ACCEPTED",
      wave4KnowledgeGraph: wave4Accepted ? "ACCEPTED" : "NOT ACCEPTED",
      wave5DigitalTwin: wave5Accepted ? "ACCEPTED" : "NOT ACCEPTED",
      ccosDependencyClean: audit.architectureClean ? "YES" : "NO",
      evolutionEngineReadiness: evolution.ready ? "READY" : "NOT READY",
      liveRanking: "UNCHANGED",
      autopilot: "DISABLED",
      appReleaseReadiness: `${mobileLocal.passed}/${mobileLocal.total}`,
      appShellReadiness: appShell.status,
    },
  };

  writeFileSync(join(OUT_DIR, "acceptance-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(fullStackAccepted ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
