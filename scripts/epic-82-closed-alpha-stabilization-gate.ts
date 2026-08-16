#!/usr/bin/env tsx
/** EPIC-82 — Closed Alpha stabilization + seamless update gate */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { resolveUpdateState } from "@/lib/mobile-release-platform/update-service/resolve-update-state";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";

type Row = { id: string; ok: boolean; detail?: string };

async function json(path: string) {
  const res = await fetch(`${STAGING}${path}`, { signal: AbortSignal.timeout(20000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const rows: Row[] = [];
  const mainSha = execSync("git rev-parse origin/main", { encoding: "utf8" }).trim().slice(0, 7);

  const version = await json("/api/version");
  const stagingSha = String((version.body as { commit?: string }).commit ?? "").slice(0, 7);
  rows.push({ id: "wave2_deployed_main_on_staging", ok: stagingSha === mainSha, detail: `${stagingSha} vs ${mainSha}` });

  const manifest = JSON.parse(readFileSync(join(process.cwd(), "mobile-release-manifest.json"), "utf8")) as {
    versionName?: string;
    versionCode?: number;
    launchGate?: { epic?: string };
  };
  rows.push({ id: "manifest_epic_82", ok: manifest.launchGate?.epic === "EPIC-82" || manifest.versionCode === 2, detail: manifest.launchGate?.epic });
  rows.push({ id: "manifest_version_011", ok: manifest.versionCode === 2, detail: `${manifest.versionName} (${manifest.versionCode})` });

  const mobileEnv = readFileSync(join(process.cwd(), "apps/mobile/src/config/env.ts"), "utf8");
  rows.push({ id: "mobile_env_011", ok: mobileEnv.includes("0.1.1-alpha") && mobileEnv.includes('"2"'), detail: "env.ts" });

  const appJson = readFileSync(join(process.cwd(), "apps/mobile/app.json"), "utf8");
  rows.push({ id: "app_json_version_code_2", ok: appJson.includes('"versionCode": 2'), detail: "app.json" });

  rows.push({
    id: "update_state_resolver",
    ok:
      resolveUpdateState({
        clientVersionCode: 1,
        latestVersionCode: 2,
        hasDownloadUrl: true,
        rolloutEligible: true,
        updateRequired: false,
        mandatory: false,
        forceUpgrade: false,
        compatible: true,
      }) === "OPTIONAL_UPDATE",
  });

  rows.push({
    id: "no_downgrade_prompt_logic",
    ok:
      resolveUpdateState({
        clientVersionCode: 2,
        latestVersionCode: 2,
        hasDownloadUrl: true,
        rolloutEligible: true,
        updateRequired: false,
        mandatory: false,
        forceUpgrade: false,
        compatible: true,
      }) === "NO_UPDATE",
  });

  const updateServiceSrc = readFileSync(
    join(process.cwd(), "lib/mobile-release-platform/update-service/index.ts"),
    "utf8",
  );
  rows.push({ id: "update_state_in_codebase", ok: updateServiceSrc.includes("updateState"), detail: "update-service" });

  const update = await json("/api/mobile/update?versionCode=1&deviceId=epic82-gate&channel=CLOSED_ALPHA");
  const payload = update.body as {
    updateState?: string;
    versionCode?: number;
    versionName?: string;
    downloadUrl?: string | null;
    channel?: string;
  };
  rows.push({ id: "update_api_ok", ok: update.ok, detail: String(update.status) });
  rows.push({
    id: "staging_update_state_live",
    ok: Boolean(payload.updateState),
    detail: payload.updateState ?? "deploy EPIC-82 + publish 0.1.1 to enable",
  });
  rows.push({ id: "update_channel_closed_alpha", ok: payload.channel === "CLOSED_ALPHA", detail: payload.channel });
  rows.push({
    id: "staging_update_offers_011",
    ok: (payload.versionCode ?? 0) >= 2 && payload.updateState !== "NO_UPDATE",
    detail: `${payload.versionName ?? "?"} (${payload.versionCode ?? "?"}) ${payload.updateState ?? "awaiting MRP publish"}`,
  });

  const updateCurrent = await json("/api/mobile/update?versionCode=2&deviceId=epic82-gate&channel=CLOSED_ALPHA");
  const currentPayload = updateCurrent.body as { updateState?: string; versionCode?: number };
  rows.push({
    id: "staging_no_downgrade_prompt",
    ok: currentPayload.updateState === "NO_UPDATE" || (payload.versionCode ?? 0) < 2,
    detail: currentPayload.updateState ?? "awaiting 0.1.1 on staging",
  });

  try {
    execSync("npm run build", { stdio: "pipe", encoding: "utf8" });
    rows.push({ id: "npm_build", ok: true });
  } catch (err) {
    rows.push({ id: "npm_build", ok: false, detail: String(err) });
  }

  try {
    execSync("npm run mobile:typecheck", { stdio: "pipe", encoding: "utf8" });
    rows.push({ id: "mobile_typecheck", ok: true });
  } catch (err) {
    rows.push({ id: "mobile_typecheck", ok: false, detail: String(err) });
  }

  const required = [
    "manifest_version_011",
    "mobile_env_011",
    "app_json_version_code_2",
    "update_state_resolver",
    "no_downgrade_prompt_logic",
    "update_state_in_codebase",
    "update_api_ok",
    "update_channel_closed_alpha",
    "npm_build",
    "mobile_typecheck",
  ];
  const failed = rows.filter((r) => !r.ok && required.includes(r.id));
  const report = {
    epic: "EPIC-82",
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    verdicts: {
      epic82: failed.length === 0 ? "ACCEPTED" : "NOT_ACCEPTED",
      physicalAndroid: process.env.PHYSICAL_ANDROID_PASS === "true" ? "PASS" : "NOT_RUN",
      seamlessUpdates: process.env.SEAMLESS_UPDATE_PASS === "true" ? "PASS" : "PENDING_PHYSICAL",
      alpha011Published: payload.versionCode === 2 ? "PUBLISHED_OR_READY" : "NOT_PUBLISHED",
      closedAlpha: "WATCH",
      appShell1: "BLOCKED",
    },
    rows,
    failed: failed.map((r) => r.id),
  };

  const outDir = join(process.cwd(), "artifacts/epic-82-closed-alpha-stabilization");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "gate-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
