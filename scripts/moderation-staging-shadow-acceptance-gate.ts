#!/usr/bin/env node
/** EPIC 190.2 — deployment + shadow acceptance gate */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

function sh(cmd: string): string {
  return execFileSync(cmd, { encoding: "utf8", shell: true }).trim();
}

async function main(): Promise<void> {
  const mainSha = sh("git rev-parse HEAD").slice(0, 7);

  const versionRes = await fetch(`${STAGING}/api/version`, { signal: AbortSignal.timeout(20000) });
  const healthRes = await fetch(`${STAGING}/api/health`, { signal: AbortSignal.timeout(20000) });
  const version = (await versionRes.json()) as { commit?: string };
  const health = (await healthRes.json()) as {
    ok?: boolean;
    runtime?: Record<string, string>;
    checks?: { database?: { reachable?: boolean; schemaCompatible?: boolean } };
  };

  const deployedSha = (version.commit ?? "").slice(0, 7);
  if (!deployedSha || (deployedSha !== mainSha && !deployedSha.startsWith(mainSha))) {
    fail(`Railway deploy pending: serving ${deployedSha}, main ${mainSha}`);
  }

  if (!health.ok) fail("health not ok");
  if (health.checks?.database?.reachable !== true) fail("database not reachable");
  if (health.checks?.database?.schemaCompatible !== true) fail("schema not compatible");
  if (health.runtime?.moderationAutomationMode !== "SHADOW") fail("not in SHADOW mode");
  if (health.runtime?.policyV2 !== "AVAILABLE") fail("policyV2 not AVAILABLE on deployed staging");
  if (health.runtime?.imageModeration !== "PARTIAL") {
    fail(`imageModeration must be PARTIAL, got ${health.runtime?.imageModeration}`);
  }
  if (health.runtime?.visualObjectClassification !== "UNAVAILABLE") {
    fail("visualObjectClassification must remain UNAVAILABLE");
  }

  const gates = [
    "npm run build",
    "npm run moderation:policy-v2:gate",
    "npm run moderation:image-ocr:gate",
    "npm run moderation:staging-image-ocr-smoke",
  ];

  for (const gate of gates) {
    console.log(`[RUN] ${gate}`);
    sh(gate);
  }

  if (!process.env.DATABASE_URL) {
    console.log("[SKIP] moderation:staging-shadow — DATABASE_URL required for final evidence");
  } else {
    console.log("[RUN] npm run moderation:staging-shadow");
    sh("npm run moderation:staging-shadow");
  }

  sh("cd apps/mobile && npm run typecheck");
  sh("npm run mobile:lot-moderation:gate");
  sh("npm run mobile:lot-publish-truth:gate");
  sh("npm run staging:backend-stability:gate");
  sh("npm run release:migration:verify");
  sh("npm run release:railway-runtime:verify");
  sh("npm run release:pipeline:verify");

  const reportPath = join(process.cwd(), "artifacts/policy-v2-shadow/staging-shadow-report.json");
  const report = existsSync(reportPath)
    ? (JSON.parse(readFileSync(reportPath, "utf8")) as Record<string, unknown>)
    : {};

  console.log(
    JSON.stringify(
      {
        verdict: "PASS",
        mainSha,
        deployedSha,
        automationVerdict: report.automationVerdict ?? "NOT_READY_FOR_AUTOMATION",
        humanReviewedCount: report.humanReviewedCount ?? 0,
        criticalFalseNegatives: report.criticalFalseNegatives ?? "UNKNOWN",
        guardedAuto: "DISABLED",
        rc105: "NOT_STARTED",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
