#!/usr/bin/env tsx
/** P0 — Candidate APK metadata verification (aapt + apkanalyzer). */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  emitReport,
  mobilePaths,
  repoRoot,
  resolveAapt,
  resolveApkanalyzer,
  sha256File,
  type GateRow,
} from "./mobile-p0-gate-lib";

const EXPECTED = {
  package: "ru.lot.marketplace.alpha",
  versionName: "0.1.5-alpha",
  versionCode: 6,
};

function parseBadging(badging: string) {
  const packageMatch = badging.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
  return {
    package: packageMatch?.[1] ?? "",
    versionCode: packageMatch ? Number(packageMatch[2]) : 0,
    versionName: packageMatch?.[3] ?? "",
  };
}

function main() {
  const apkPath = process.env.RELEASE_APK?.trim() || mobilePaths().releaseApk;
  const rows: GateRow[] = [];

  rows.push({ id: "apk_exists", ok: existsSync(apkPath), detail: apkPath });
  if (!existsSync(apkPath)) {
    emitReport("P0 APK Metadata Gate", rows, {}, "apk-metadata-gate-report.json");
    return;
  }

  const sha256 = sha256File(apkPath);
  rows.push({ id: "sha256_present", ok: sha256.length === 64, detail: sha256 });

  const aapt = resolveAapt();
  const badging = execSync(`"${aapt}" dump badging "${apkPath}"`, { encoding: "utf8" });
  const parsed = parseBadging(badging);

  rows.push({ id: "package_name", ok: parsed.package === EXPECTED.package, detail: parsed.package });
  rows.push({
    id: "version_name",
    ok: parsed.versionName === EXPECTED.versionName,
    detail: parsed.versionName,
  });
  rows.push({
    id: "version_code",
    ok: parsed.versionCode === EXPECTED.versionCode,
    detail: String(parsed.versionCode),
  });

  const apkanalyzer = resolveApkanalyzer();
  if (apkanalyzer) {
    try {
      const manifest = execSync(`"${apkanalyzer}" manifest print "${apkPath}"`, { encoding: "utf8" });
      rows.push({
        id: "apkanalyzer_manifest",
        ok: manifest.includes(EXPECTED.package) && manifest.includes(String(EXPECTED.versionCode)),
        detail: "manifest print ok",
      });
    } catch (err) {
      rows.push({
        id: "apkanalyzer_manifest",
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    rows.push({ id: "apkanalyzer_manifest", ok: true, detail: "apkanalyzer unavailable — skipped" });
  }

  const root = repoRoot();
  const buildInfoPath = join(root, "apps/mobile/src/config/build-info.generated.ts");
  if (existsSync(buildInfoPath)) {
    const buildInfo = readFileSync(buildInfoPath, "utf8");
    const commitMatch = buildInfo.match(/"commit": "([^"]+)"/);
    const gitShaMatch = buildInfo.match(/"gitSha": "([^"]+)"/);
    rows.push({
      id: "build_commit_embedded",
      ok: Boolean(commitMatch?.[1] && commitMatch[1] !== "unknown"),
      detail: commitMatch?.[1] ?? "missing",
    });
    rows.push({
      id: "build_git_sha_embedded",
      ok: Boolean(gitShaMatch?.[1] && gitShaMatch[1] !== "unknown"),
      detail: gitShaMatch?.[1]?.slice(0, 12) ?? "missing",
    });
  } else {
    rows.push({ id: "build_commit_embedded", ok: false, detail: "build-info.generated.ts missing" });
  }

  emitReport(
    "P0 APK Metadata Gate",
    rows,
    { apk: { path: apkPath, sha256, expected: EXPECTED, badging: parsed } },
    "apk-metadata-gate-report.json",
  );
}

main();
