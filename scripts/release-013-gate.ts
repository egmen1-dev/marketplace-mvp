#!/usr/bin/env tsx
/** RELEASE 0.1.3-alpha — build verification gate */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { CLOSED_ALPHA_APK } from "@/lib/mobile-release-platform/constants";

type Row = { id: string; ok: boolean; detail?: string };

const AAPT = process.env.AAPT_PATH ?? "/workspace/.android-sdk/build-tools/36.0.0/aapt";
const APK_PATH =
  process.env.RELEASE_APK_PATH ?? join(process.cwd(), "artifacts/epic-84-release-013/lot-android-alpha-0.1.3.apk");

function main() {
  const rows: Row[] = [];
  const root = process.cwd();

  rows.push({ id: "version_name", ok: CLOSED_ALPHA_APK.versionName === "0.1.3-alpha", detail: CLOSED_ALPHA_APK.versionName });
  rows.push({ id: "version_code", ok: CLOSED_ALPHA_APK.versionCode === 4, detail: String(CLOSED_ALPHA_APK.versionCode) });
  rows.push({ id: "sha256_real", ok: !CLOSED_ALPHA_APK.sha256.startsWith("pending"), detail: CLOSED_ALPHA_APK.sha256.slice(0, 16) });

  const errorScreen = readFileSync(join(root, "apps/mobile/src/features/startup/StartupErrorScreen.tsx"), "utf8");
  const required = ["Startup ID", "Этап", "Код", "Скопировать диагностику", "Экспортировать отчёт", "ConnectivityPanel", "StartupBuildStamp"];
  for (const token of required) {
    rows.push({ id: `startup_${token}`, ok: errorScreen.includes(token) });
  }

  const env = readFileSync(join(root, "apps/mobile/src/config/env.ts"), "utf8");
  rows.push({ id: "env_version", ok: env.includes("0.1.3-alpha") });
  rows.push({ id: "env_build_number", ok: env.includes('buildNumber: "4"') });

  if (existsSync(APK_PATH)) {
    rows.push({ id: "apk_exists", ok: true, detail: APK_PATH });
    try {
      const badging = execSync(`"${AAPT}" dump badging "${APK_PATH}"`, { encoding: "utf8" });
      rows.push({ id: "aapt_package", ok: badging.includes("package: name='ru.lot.marketplace.alpha'"), detail: "ru.lot.marketplace.alpha" });
      rows.push({ id: "aapt_version_name", ok: badging.includes("versionName='0.1.3-alpha'"), detail: badging.match(/versionName='([^']+)'/)?.[1] });
      rows.push({ id: "aapt_version_code", ok: badging.includes("versionCode='4'"), detail: badging.match(/versionCode='([^']+)'/)?.[1] });
      const sha = execSync(`sha256sum "${APK_PATH}"`, { encoding: "utf8" }).split(" ")[0]?.trim();
      rows.push({ id: "sha256_matches_constants", ok: sha === CLOSED_ALPHA_APK.sha256, detail: sha });
    } catch (err) {
      rows.push({ id: "aapt_dump", ok: false, detail: String(err) });
    }
  } else {
    rows.push({ id: "apk_exists", ok: false, detail: APK_PATH });
  }

  try {
    execSync("npm run mobile:typecheck", { stdio: "pipe" });
    rows.push({ id: "mobile_typecheck", ok: true });
  } catch {
    rows.push({ id: "mobile_typecheck", ok: false });
  }

  try {
    execSync("npx vitest run tests/release-013-closed-alpha.test.ts", { stdio: "pipe" });
    rows.push({ id: "release_013_tests", ok: true });
  } catch {
    rows.push({ id: "release_013_tests", ok: false });
  }

  const failed = rows.filter((r) => !r.ok);
  const report = {
    release: "0.1.3-alpha",
    versionCode: 4,
    generatedAt: new Date().toISOString(),
    apkPath: existsSync(APK_PATH) ? APK_PATH : null,
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
  };

  const outDir = join(root, "artifacts/epic-84-release-013");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "release-gate.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
