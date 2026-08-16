#!/usr/bin/env tsx
/**
 * EPIC-80 — Closed Alpha Launch Gate
 * Automated checks for staging + release metadata. Physical device steps are operator-run.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { CLOSED_ALPHA_APK, CLOSED_ALPHA_APK_DOWNLOAD_URL } from "@/lib/mobile-release-platform/constants";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const ARTIFACT_APK = process.env.CLOSED_ALPHA_APK_PATH ?? "/opt/cursor/artifacts/lot-android-alpha-0.1.0.apk";

type Check = { id: string; ok: boolean; detail: string };
type Verdict = "READY" | "NOT_READY" | "PASS" | "FAIL" | "NOT_RUN" | "ACCEPTED" | "NOT_ACCEPTED" | "PUBLISHED" | "NOT_PUBLISHED" | "GO" | "WATCH" | "NO-GO" | "UNBLOCKED" | "BLOCKED";

async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${STAGING}${path}`, { ...init, signal: AbortSignal.timeout(25000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function main() {
  const checks: Check[] = [];
  const mainSha = execSync("git rev-parse origin/main", { encoding: "utf8" }).trim().slice(0, 7);

  // PART 1 — deploy parity
  const version = await json("/api/version");
  const stagingSha = String((version.body as { commit?: string }).commit ?? "").slice(0, 7);
  checks.push({
    id: "staging_equals_main",
    ok: stagingSha === mainSha,
    detail: `staging=${stagingSha} main=${mainSha}`,
  });

  // PART 3 — health surfaces
  for (const [id, path] of [
    ["health", "/api/health"],
    ["mobile_readiness", "/api/mobile/readiness"],
    ["mobile_bootstrap", "/api/mobile/bootstrap"],
    ["mobile_config", "/api/mobile/config"],
    ["mobile_update", "/api/mobile/update?versionCode=1&deviceId=gate80-test"],
    ["mobile_artifact", "/api/mobile/releases/artifact"],
    ["product_ops_config", "/api/product-ops/config?surface=mobile"],
  ] as const) {
    const r = await json(path);
    checks.push({ id, ok: r.ok, detail: String(r.status) });
  }

  // PART 4 — APK hash
  let localSha = "missing";
  try {
    localSha = sha256File(ARTIFACT_APK);
  } catch {
    /* optional in CI */
  }
  checks.push({
    id: "apk_sha256",
    ok: localSha === CLOSED_ALPHA_APK.sha256,
    detail: localSha,
  });

  // PART 5 — HTTPS hosting
  checks.push({
    id: "apk_https_url",
    ok: CLOSED_ALPHA_APK_DOWNLOAD_URL.startsWith("https://"),
    detail: CLOSED_ALPHA_APK_DOWNLOAD_URL,
  });

  // PART 7 — update metadata (requires MRP published on staging DB)
  const update = await json("/api/mobile/update?versionCode=0&deviceId=gate80-closed-alpha&channel=CLOSED_ALPHA");
  const upd = update.body as {
    versionName?: string;
    downloadUrl?: string | null;
    sha256?: string | null;
    channel?: string;
    updateRequired?: boolean;
  };
  const updateHasRealBuild =
    upd.versionName === CLOSED_ALPHA_APK.versionName &&
    Boolean(upd.downloadUrl) &&
    upd.sha256 === CLOSED_ALPHA_APK.sha256;
  checks.push({
    id: "update_real_build",
    ok: updateHasRealBuild,
    detail: JSON.stringify({
      versionName: upd.versionName,
      downloadUrl: upd.downloadUrl,
      sha256: upd.sha256?.slice(0, 12),
      channel: upd.channel,
    }),
  });
  checks.push({
    id: "update_not_forced",
    ok: upd.updateRequired === false,
    detail: String(upd.updateRequired),
  });

  // Admin pages return 401 without session — expect redirect/block not 500
  for (const [id, path] of [
    ["admin_mobile_releases", "/admin/mobile/releases"],
    ["admin_product_health", "/admin/product-health"],
    ["admin_operations", "/admin/operations"],
    ["admin_closed_alpha", "/admin/closed-alpha"],
  ] as const) {
    const res = await fetch(`${STAGING}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15000) });
    checks.push({
      id,
      ok: res.status === 200 || res.status === 307 || res.status === 308 || res.status === 401 || res.status === 403,
      detail: String(res.status),
    });
  }

  const passed = checks.filter((c) => c.ok).length;
  const automatedOk = checks.filter((c) => c.ok).length === checks.length;

  const physicalVerdict: Verdict = process.env.PHYSICAL_ANDROID_PASS === "true" ? "PASS" : "NOT_RUN";
  const p0 = physicalVerdict === "PASS" ? 0 : 1;
  const p1 = 0;

  const mobileStaging: Verdict = checks.find((c) => c.id === "staging_equals_main")?.ok ? "READY" : "NOT_READY";
  const mrp: Verdict = updateHasRealBuild ? "ACCEPTED" : "NOT_ACCEPTED";
  const pop: Verdict = checks.find((c) => c.id === "product_ops_config")?.ok ? "ACCEPTED" : "NOT_ACCEPTED";
  const closedAlphaRelease: Verdict = updateHasRealBuild ? "PUBLISHED" : "NOT_PUBLISHED";

  let closedAlpha: Verdict = "NO-GO";
  if (physicalVerdict === "PASS" && p0 === 0 && mrp === "ACCEPTED" && pop === "ACCEPTED") closedAlpha = "GO";
  else if (physicalVerdict === "NOT_RUN" && automatedOk) closedAlpha = "WATCH";

  const appShell1: Verdict =
    closedAlpha === "GO" && mobileStaging === "READY" ? "UNBLOCKED" : "BLOCKED";

  const report = {
    epic: "EPIC-80",
    evaluatedAt: new Date().toISOString(),
    stagingUrl: STAGING,
    mainSha,
    stagingSha,
    checks,
    passed,
    total: checks.length,
    automatedOk,
    verdicts: {
      MOBILE_STAGING: mobileStaging,
      PHYSICAL_ANDROID: physicalVerdict,
      P0: p0,
      P1: p1,
      MRP: mrp,
      POP: pop,
      CLOSED_ALPHA_RELEASE: closedAlphaRelease,
      CLOSED_ALPHA: closedAlpha,
      APP_SHELL_1: appShell1,
    },
    operatorNextSteps: [
      physicalVerdict === "NOT_RUN" ? "Run ./scripts/mobile-physical-acceptance-adb.sh on USB Android" : null,
      mobileStaging === "NOT_READY" ? "Deploy origin/main to Railway staging (750377f+)" : null,
      mrp === "NOT_ACCEPTED" ? "Run npx tsx scripts/epic-80-publish-closed-alpha-release.ts on staging DB" : null,
      mrp === "NOT_ACCEPTED" ? "Apply prisma migrate deploy on staging DB" : null,
      closedAlpha === "GO" ? "Invite 5–10 testers using docs/mobile/ALPHA_TESTER_PACKAGE.md" : null,
    ].filter(Boolean),
  };

  mkdirSync(join(process.cwd(), "artifacts/epic-80-closed-alpha-launch-gate"), { recursive: true });
  const out = join(process.cwd(), "artifacts/epic-80-closed-alpha-launch-gate/report.json");
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report.verdicts, null, 2));
  console.log(`\nReport: ${out}`);
  console.log(`Checks: ${passed}/${checks.length}`);

  if (!automatedOk) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
