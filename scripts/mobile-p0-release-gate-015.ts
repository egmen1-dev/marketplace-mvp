#!/usr/bin/env tsx
/**
 * P0 — 0.1.5-alpha release gate pipeline
 *
 * dependency compatibility → clean build → APK metadata → bytecode guard → Firebase Test Lab
 *
 * Publish is blocked until Firebase Test Lab PASS on Pixel 5 / API 30.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { mobilePaths, repoRoot, sha256File, type GateRow } from "./mobile-p0-gate-lib";

const SKIP_BUILD = process.env.SKIP_CLEAN_BUILD === "1";

function runStep(id: string, cmd: string, cwd: string): GateRow {
  try {
    execSync(cmd, { cwd, stdio: "inherit" });
    return { id, ok: true, detail: cmd };
  } catch (err) {
    return { id, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

function runGate(id: string, script: string, reportFile: string, cwd: string): GateRow {
  try {
    execSync(`npx tsx ${script}`, { cwd, stdio: "pipe", maxBuffer: 20 * 1024 * 1024 });
  } catch {
    /* gate scripts exit 1 on FAIL — read report below */
  }
  const reportPath = join(mobilePaths(cwd).artifacts, reportFile);
  if (existsSync(reportPath)) {
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as { verdict?: string };
    return { id, ok: report.verdict === "PASS", detail: report.verdict ?? "unknown" };
  }
  return { id, ok: false, detail: `${script} FAIL (${reportPath})` };
}

function main() {
  const root = repoRoot();
  const paths = mobilePaths(root);
  const rows: GateRow[] = [];
  const artifactApk = join(paths.artifacts, "lot-android-alpha-0.1.5.apk");

  rows.push(runGate("expo_dependency_gate", "scripts/mobile-p0-expo-deps-gate.ts", "expo-deps-gate-report.json", root));
  rows.push(runGate("p0_startup_gate", "scripts/epic-84-p0-startup-gate.ts", "gate-report.json", root));

  rows.push(runStep("write_build_info", "npm run mobile:write-build-info", root));

  if (!SKIP_BUILD) {
    if (existsSync(paths.android)) {
      execSync(`rm -rf "${paths.android}"`, { stdio: "inherit" });
    }
    rows.push(
      runStep(
        "clean_prebuild",
        "npx expo prebuild --clean --platform android --no-install",
        paths.mobile,
      ),
    );

    const gradleClean = [
      `rm -rf "${join(paths.android, ".gradle")}"`,
      `rm -rf "${join(paths.android, "build")}"`,
      `rm -rf "${join(paths.android, "app/build")}"`,
      `rm -rf "${join(paths.mobile, "node_modules/expo-clipboard/android/build")}"`,
    ].join(" && ");
    execSync(gradleClean, { shell: "/bin/bash", stdio: "inherit" });

    rows.push(
      runStep(
        "assemble_release_clean",
        "./gradlew clean assembleRelease --no-build-cache",
        paths.android,
      ),
    );
  } else {
    rows.push({ id: "clean_build", ok: true, detail: "SKIP_CLEAN_BUILD=1" });
  }

  rows.push({
    id: "release_apk_exists",
    ok: existsSync(paths.releaseApk),
    detail: paths.releaseApk,
  });

  if (existsSync(paths.releaseApk)) {
    mkdirSync(paths.artifacts, { recursive: true });
    cpSync(paths.releaseApk, artifactApk, { force: true });
    rows.push({ id: "artifact_apk_copied", ok: existsSync(artifactApk), detail: artifactApk });
  }

  rows.push(
    runGate(
      "apk_metadata_gate",
      "scripts/mobile-p0-apk-metadata-gate.ts",
      "apk-metadata-gate-report.json",
      root,
    ),
  );
  rows.push(
    runGate(
      "bytecode_guard",
      "scripts/mobile-p0-bytecode-guard.ts",
      "bytecode-guard-report.json",
      root,
    ),
  );

  let ftlStatus = "NOT RUN";
  try {
    execSync("npx tsx scripts/mobile-p0-firebase-test-lab.ts", { cwd: root, stdio: "pipe" });
  } catch {
    /* expected when gcloud unavailable */
  }
  const ftlReportPath = join(paths.artifacts, "firebase-test-lab-report.json");
  if (existsSync(ftlReportPath)) {
    const ftlReport = JSON.parse(readFileSync(ftlReportPath, "utf8")) as {
      status?: string;
      verdict?: string;
    };
    ftlStatus = ftlReport.status ?? ftlReport.verdict ?? "UNKNOWN";
  }
  rows.push({
    id: "firebase_test_lab",
    ok: ftlStatus === "PASS",
    detail: ftlStatus,
  });

  const failed = rows.filter((r) => !r.ok);
  const publishAllowed = failed.length === 0 && ftlStatus === "PASS";

  const report = {
    phase: "P0 Release Gate 0.1.5-alpha",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    publishAllowed,
    ftlStatus,
    apk: existsSync(artifactApk)
      ? { path: artifactApk, sha256: sha256File(artifactApk) }
      : null,
    rows,
    policy: {
      githubReleaseBlocked: !publishAllowed,
      mrpPublishBlocked: !publishAllowed,
      requiredDevice: "Pixel 5 / API 30 / en_US / portrait",
      requiredTest: "Robo",
    },
  };

  writeFileSync(join(paths.artifacts, "release-gate-015-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (failed.length > 0 || !publishAllowed) {
    process.exit(1);
  }
}

main();
