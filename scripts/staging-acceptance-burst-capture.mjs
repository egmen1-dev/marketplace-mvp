#!/usr/bin/env node
/**
 * Instrumented single A–H acceptance run for burst capture.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const RUN_ID = process.env.STABILITY_BURST_RUN_ID ?? `stability-${Date.now()}`;
const OUT = resolve("artifacts/staging-stability/burst-capture.json");
const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";

async function main() {
  mkdirSync(resolve("artifacts/staging-stability"), { recursive: true });

  const healthRes = await fetch(`${STAGING}/api/health`);
  const health = await healthRes.json().catch(() => ({}));
  const expectedSha = (process.env.EXPECTED_RAILWAY_SHA ?? health?.version?.commit ?? "").slice(0, 7);

  const startedAt = new Date().toISOString();
  const result = spawnSync(
    "node",
    ["scripts/rc10.4-moderation-staging-acceptance.mjs"],
    {
      env: {
        ...process.env,
        RC10_4_ACCEPTANCE_RUN_ID: RUN_ID,
        EXPECTED_RAILWAY_SHA: expectedSha,
        STAGING_ROUTE_TIMING: "1",
      },
      encoding: "utf8",
    },
  );

  let acceptance = {};
  try {
    acceptance = JSON.parse(readFileSync(resolve("artifacts/closed-beta-rc10.4/staging-moderation-acceptance.json"), "utf8"));
  } catch {
    acceptance = { parseError: true, stderr: result.stderr?.slice(0, 500) };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runId: RUN_ID,
    startedAt,
    endedAt: new Date().toISOString(),
    staging: STAGING,
    deployedSha: health?.version?.commit ?? null,
    exitCode: result.status,
    acceptance,
    server500Events: acceptance.server500Events ?? [],
    application500Count: acceptance.unexplainedServer500Count ?? acceptance.server500Events?.length ?? 0,
    transportErrors: acceptance.transportErrors ?? [],
    scenarios: acceptance.scenarios ?? [],
    verdict: acceptance.verdict ?? "BLOCKED_FOR_RC10_4_BUILD",
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
