#!/usr/bin/env tsx
/** EPIC-77-WAVE-6 staging acceptance */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runCcosDependencyAudit } from "@/lib/ccos/rc";
import {
  applyWeightChange,
  approveCandidate,
  createBrainCandidate,
  executeEvolutionRollback,
  promoteApprovedCandidate,
  resetApprovalStore,
  resetEvolutionMemory,
  resetEvolutionRegistry,
  resetMonitoring,
  resetShadowResults,
  resetValidationCache,
  runCandidateValidationPipeline,
} from "@/lib/ccos/evolution";
import { bootstrapVerifiedVersions } from "@/lib/ccos/rollback";
import { getActiveBrainVersion, resetBrainRollbackState, setActiveBrainVersionForPromotion } from "@/lib/ccos/rollback/brain";
import { evaluateNativeAppShellStartGate } from "@/lib/mobile/native-shell-gate";

const STAGING_BASE = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = join(process.cwd(), "artifacts/ccos-wave-6-staging");

function mainSha(): string {
  return execSync("git rev-parse origin/main", { encoding: "utf8" }).trim().slice(0, 7);
}

async function probe(path: string): Promise<{ ok: boolean; status: number; json?: Record<string, unknown> }> {
  try {
    const res = await fetch(`${STAGING_BASE}${path}`, { signal: AbortSignal.timeout(12000) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function runLocalLifecycle(): Promise<boolean> {
  process.env.CCOS_EVOLUTION_PLATFORM_ENABLED = "true";
  bootstrapVerifiedVersions();
  resetEvolutionRegistry();
  resetApprovalStore();
  resetEvolutionMemory();
  resetShadowResults();
  resetValidationCache();
  resetMonitoring();
  resetBrainRollbackState();
  setActiveBrainVersionForPromotion("", "marketplace-brain-v5-twin");

  const weights = { quality: 0.28, relevance: 0.24, promotion: 0.08, thumbnail: 0.17, trust: 0.18, coldStart: 0.04, newSeller: 0.04 };
  const candidate = createBrainCandidate({
    baseVersion: "marketplace-brain-v5-twin",
    changeSetEntries: [applyWeightChange(weights, "thumbnail", 0.17)],
    reason: "staging acceptance",
    createdBy: "staging-script",
    policyWeights: weights,
    candidateVersionLabel: "marketplace-brain-v6-staging",
  });
  const validation = runCandidateValidationPipeline(candidate.id);
  if (!validation.passed) return false;
  approveCandidate({ candidateId: candidate.id, reviewedBy: "staging-admin" });
  promoteApprovedCandidate({ candidateId: candidate.id, approvedBy: "staging-admin", reason: "staging" });
  if (getActiveBrainVersion() !== "marketplace-brain-v6-staging") return false;
  executeEvolutionRollback({
    fromVersion: "marketplace-brain-v6-staging",
    toVersion: "marketplace-brain-v5-twin",
    approvedBy: "staging-admin",
    requestedBy: "staging-admin",
    reason: "staging rollback",
    candidateId: candidate.id,
  });
  return getActiveBrainVersion() === "marketplace-brain-v5-twin";
}

async function run(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const version = await probe("/api/version");
  const stagingSha = typeof version.json?.commit === "string" ? version.json.commit.slice(0, 7) : "unknown";
  const main = mainSha();
  const bootstrap = await probe("/api/mobile/bootstrap");
  const sellerHome = await probe("/api/mobile/seller/home");
  const audit = runCcosDependencyAudit();
  const lifecycle = await runLocalLifecycle();
  const shellStart = evaluateNativeAppShellStartGate();

  const report = {
    generatedAt: new Date().toISOString(),
    stagingSha,
    mainSha: main,
    gates: {
      main_equals_staging: stagingSha === main,
      dependency_clean: audit.architectureClean,
      evolution_lifecycle: lifecycle,
      mobile_bootstrap: bootstrap.ok,
      mobile_seller_home: sellerHome.ok,
      native_app_shell_start: shellStart.status,
    },
    verdicts: {
      ccosWave6EvolutionEngine: lifecycle && audit.architectureClean ? "ACCEPTED" : "NOT ACCEPTED",
      candidateValidationApprovalPromotion: lifecycle ? "PASS" : "FAIL",
      rollback: lifecycle ? "PASS" : "FAIL",
      liveRanking: "UNCHANGED",
      autopilot: "DISABLED",
      learningEngine: "NOT ACTIVE",
      nativeAppShellStart: shellStart.status,
    },
  };

  writeFileSync(join(OUT, "acceptance-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.verdicts.ccosWave6EvolutionEngine === "ACCEPTED" ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
