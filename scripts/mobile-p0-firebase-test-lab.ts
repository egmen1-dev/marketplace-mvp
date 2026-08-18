#!/usr/bin/env tsx
/** P0 — Firebase Test Lab validation gate (Pixel 5 / API 30 Robo). */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { emitReport, mobilePaths, sha256File, type GateRow } from "./mobile-p0-gate-lib";

const FTL_DEVICE = {
  model: "redfin",
  version: "30",
  locale: "en_US",
  orientation: "portrait",
};

function hasGcloud(): boolean {
  try {
    execSync("gcloud --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const paths = mobilePaths();
  const apkPath = process.env.RELEASE_APK?.trim() || paths.releaseApk;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? "";
  const resultsDir = join(paths.artifacts, "firebase-test-lab-015");
  mkdirSync(resultsDir, { recursive: true });

  const rows: GateRow[] = [];
  rows.push({ id: "apk_exists", ok: existsSync(apkPath), detail: apkPath });

  if (!existsSync(apkPath)) {
    emitReport("P0 Firebase Test Lab Gate", rows, { status: "NOT RUN" }, "firebase-test-lab-report.json");
    return;
  }

  const sha256 = sha256File(apkPath);
  rows.push({ id: "apk_sha256", ok: true, detail: sha256 });

  if (process.env.SKIP_FIREBASE_TEST_LAB === "1") {
    rows.push({ id: "firebase_test_lab", ok: true, detail: "SKIP_FIREBASE_TEST_LAB=1" });
    emitReport(
      "P0 Firebase Test Lab Gate",
      rows,
      { status: "SKIPPED", device: FTL_DEVICE, sha256 },
      "firebase-test-lab-report.json",
    );
    return;
  }

  if (!hasGcloud()) {
    rows.push({
      id: "gcloud_available",
      ok: false,
      detail: "gcloud CLI not installed — operator must run Test Lab manually",
    });
    rows.push({ id: "firebase_test_lab", ok: false, detail: "NOT RUN" });
    writeFileSync(
      join(resultsDir, "operator-instructions.md"),
      `# Firebase Test Lab — operator run

Upload \`${apkPath}\` (SHA256: ${sha256}) to Firebase Test Lab.

Device matrix (required first):
- Model: Google Pixel 5 (\`redfin\`)
- API level: 30
- Locale: en_US
- Orientation: portrait

Test type: Robo

After run, save logcat + crash artifacts to:
\`${resultsDir}\`

Then re-run with results:
\`FIREBASE_TEST_LAB_RESULT=PASS npx tsx scripts/mobile-p0-firebase-test-lab.ts\`
`,
    );
    emitReport(
      "P0 Firebase Test Lab Gate",
      rows,
      { status: "NOT RUN", device: FTL_DEVICE, sha256, instructions: join(resultsDir, "operator-instructions.md") },
      "firebase-test-lab-report.json",
    );
    return;
  }

  if (!projectId) {
    rows.push({
      id: "firebase_project",
      ok: false,
      detail: "Set FIREBASE_PROJECT_ID or GCLOUD_PROJECT",
    });
    emitReport("P0 Firebase Test Lab Gate", rows, { status: "NOT RUN" }, "firebase-test-lab-report.json");
    return;
  }

  const resultOverride = process.env.FIREBASE_TEST_LAB_RESULT?.trim().toUpperCase();
  if (resultOverride === "PASS" || resultOverride === "FAIL") {
    const pass = resultOverride === "PASS";
    rows.push({ id: "firebase_test_lab", ok: pass, detail: `operator override ${resultOverride}` });
    emitReport(
      "P0 Firebase Test Lab Gate",
      rows,
      { status: resultOverride, device: FTL_DEVICE, sha256 },
      "firebase-test-lab-report.json",
    );
    return;
  }

  const outFile = join(resultsDir, "ftl-robo-output.json");
  const cmd = [
    "gcloud firebase test android run",
    `--type robo`,
    `--app "${apkPath}"`,
    `--device model=${FTL_DEVICE.model},version=${FTL_DEVICE.version},locale=${FTL_DEVICE.locale},orientation=${FTL_DEVICE.orientation}`,
    `--project ${projectId}`,
    `--results-dir ${resultsDir}`,
    `--format json`,
  ].join(" ");

  try {
    const out = execSync(cmd, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    writeFileSync(outFile, out);
    const parsed = JSON.parse(out) as { outcomeSummary?: string; testDetails?: unknown };
    const pass = /success|passed/i.test(parsed.outcomeSummary ?? out);
    rows.push({ id: "firebase_test_lab", ok: pass, detail: parsed.outcomeSummary ?? "completed" });
    emitReport(
      "P0 Firebase Test Lab Gate",
      rows,
      { status: pass ? "PASS" : "FAIL", device: FTL_DEVICE, sha256, output: outFile },
      "firebase-test-lab-report.json",
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    rows.push({ id: "firebase_test_lab", ok: false, detail: message.slice(0, 500) });
    emitReport(
      "P0 Firebase Test Lab Gate",
      rows,
      { status: "FAIL", device: FTL_DEVICE, sha256 },
      "firebase-test-lab-report.json",
    );
  }
}

main();
