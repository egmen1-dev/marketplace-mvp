#!/usr/bin/env tsx
/**
 * Release migration gate — detects code/schema drift on staging.
 * Fails when deployed app requires EPIC 174 schema but DB is incompatible.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = join(process.cwd(), "artifacts/closed-beta-rc10.4");
const EXPECTED_SHA = (process.env.EXPECTED_RAILWAY_SHA ?? "").slice(0, 7);

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function probe(path: string, init: RequestInit = {}) {
  const res = await fetch(`${STAGING}${path}`, { ...init, signal: AbortSignal.timeout(30000) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  sh("git fetch origin main 2>/dev/null || true");
  const mainSha = sh("git rev-parse origin/main").slice(0, 7);

  const health = await probe("/api/health");
  const version = await probe("/api/version");
  const deployedSha = String(
    (health.body as { version?: { commit?: string } })?.version?.commit ??
      (version.body as { commit?: string })?.commit ??
      "",
  ).slice(0, 7);

  const db = (health.body as { checks?: { database?: Record<string, unknown> } })?.checks?.database ?? {};
  const reachable = db.reachable === true || db.ok === true;
  const schemaCompatible = db.schemaCompatible === true;

  const shaOk =
    deployedSha.length > 0 &&
    (deployedSha === mainSha || (EXPECTED_SHA.length > 0 && deployedSha === EXPECTED_SHA));

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    mainSha,
    deployedSha,
    shaMatch: shaOk,
    database: {
      reachable,
      schemaCompatible,
      detail: db.detail ?? null,
      missingColumns: db.missingColumns ?? null,
      missingTables: db.missingTables ?? null,
      epic174MigrationApplied: db.epic174MigrationApplied ?? null,
    },
    healthStatus: health.status,
    verdict:
      health.ok &&
      reachable &&
      schemaCompatible &&
      shaOk
        ? "PASS"
        : "BLOCKED_FOR_RC10_4_BUILD",
    invariant:
      "Deployment is not release-ready when application schema and database migration state are incompatible.",
  };

  writeFileSync(join(OUT, "schema-compatibility.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (report.verdict !== "PASS") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
