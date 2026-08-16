#!/usr/bin/env tsx
/** EPIC-83 — Minimum Supported Version + Alpha Baseline gate */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE,
  CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_NAME,
} from "@/lib/mobile-release-platform/baseline";
import { buildMobileBootstrapPayload } from "@/lib/mobile/bootstrap";
import { buildMobileUpdatePayload } from "@/lib/mobile-release-platform/update-service";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";

type Row = { id: string; ok: boolean; detail?: string };

async function json(path: string) {
  const res = await fetch(`${STAGING}${path}`, { signal: AbortSignal.timeout(20000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const rows: Row[] = [];

  rows.push({
    id: "minimum_supported_version_code",
    ok: CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE === 3,
    detail: String(CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE),
  });
  rows.push({
    id: "minimum_supported_version_name",
    ok: CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_NAME === "0.1.2-alpha",
    detail: CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_NAME,
  });

  const mobileEnv = readFileSync(join(process.cwd(), "apps/mobile/src/config/env.ts"), "utf8");
  rows.push({
    id: "mobile_env_012",
    ok: mobileEnv.includes("0.1.2-alpha") && mobileEnv.includes('"3"'),
    detail: "env.ts",
  });

  const appJson = readFileSync(join(process.cwd(), "apps/mobile/app.json"), "utf8");
  rows.push({ id: "app_json_version_code_3", ok: appJson.includes('"versionCode": 3'), detail: "app.json" });

  rows.push({
    id: "legacy_payload_removed",
    ok: !existsSync(join(process.cwd(), "lib/mobile-release-platform/update-service/legacy.ts")),
    detail: "legacy.ts deleted",
  });

  rows.push({
    id: "unsupported_client_screen",
    ok: existsSync(join(process.cwd(), "apps/mobile/src/components/UnsupportedClientScreen.tsx")),
  });

  rows.push({
    id: "startup_pipeline_module",
    ok: existsSync(join(process.cwd(), "apps/mobile/src/boot/run-startup-pipeline.ts")),
  });

  const bootstrap = buildMobileBootstrapPayload();
  rows.push({
    id: "bootstrap_minimum_supported",
    ok: bootstrap.minimumSupportedVersionCode === 3,
    detail: String(bootstrap.minimumSupportedVersionCode),
  });

  process.env.CCOS_ENABLED = "true";
  const unsupported = await buildMobileUpdatePayload({ clientVersionCode: 1, channel: "CLOSED_ALPHA" });
  rows.push({
    id: "unsupported_client_v1",
    ok: unsupported.updateState === "UNSUPPORTED_CLIENT" && unsupported.reason === "CLIENT_TOO_OLD",
    detail: unsupported.updateState,
  });

  const supported = await buildMobileUpdatePayload({ clientVersionCode: 3, channel: "CLOSED_ALPHA" });
  rows.push({
    id: "supported_client_v3",
    ok: supported.updateState === "NO_UPDATE" || supported.updateState === "OPTIONAL_UPDATE",
    detail: supported.updateState,
  });

  const stagingBootstrap = await json("/api/mobile/bootstrap");
  rows.push({ id: "staging_bootstrap_ok", ok: stagingBootstrap.ok, detail: String(stagingBootstrap.status) });

  const stagingUpdate = await json("/api/mobile/update?versionCode=1&deviceId=epic83-gate&channel=CLOSED_ALPHA");
  const updateBody = stagingUpdate.body as { updateState?: string };
  rows.push({
    id: "staging_unsupported_after_deploy",
    ok: updateBody.updateState === "UNSUPPORTED_CLIENT" || stagingUpdate.ok,
    detail: updateBody.updateState ?? `HTTP ${stagingUpdate.status}`,
  });

  try {
    execSync("npm run build", { stdio: "pipe" });
    rows.push({ id: "build", ok: true });
  } catch (err) {
    rows.push({ id: "build", ok: false, detail: String(err) });
  }

  try {
    execSync("npm test -- --run tests/epic-83-minimum-supported-version.test.ts tests/mobile-release-platform.test.ts", {
      stdio: "pipe",
    });
    rows.push({ id: "epic83_tests", ok: true });
  } catch {
    rows.push({ id: "epic83_tests", ok: false });
  }

  const failed = rows.filter((r) => !r.ok);
  const report = {
    epic: "EPIC-83",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
  };

  const outDir = join(process.cwd(), "artifacts/epic-83-minimum-supported-version");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "gate-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
