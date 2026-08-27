#!/usr/bin/env node
/** RC10.7 update API verification + canonical APK SHA256 match. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = resolve("artifacts/closed-beta-rc10.7/update-matrix.json");
const UPDATE_API_OUT = resolve("artifacts/closed-beta-rc10.7/update-api-verification.json");
const manifestPath = resolve("artifacts/closed-beta-rc10.7/build-manifest.json");
const TARGET_CODE = 23;

async function probe(versionCode) {
  const res = await fetch(`${STAGING}/api/mobile/android/update?versionCode=${versionCode}&channel=BETA`, {
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => ({}));
  const updateState = body.updateState ?? body.state ?? "UNKNOWN";
  const targetCode = body.versionCode ?? body.release?.versionCode ?? body.targetVersionCode ?? null;
  const targetName = body.versionName ?? body.release?.versionName ?? body.targetVersionName ?? null;
  let expectedState = "UNKNOWN";
  let verdict = "NOT_PUBLISHED";
  if (versionCode < TARGET_CODE) {
    expectedState = "OPTIONAL_UPDATE";
    verdict = updateState === "OPTIONAL_UPDATE" && targetCode === TARGET_CODE ? "PASS" : "NOT_PUBLISHED";
  } else if (versionCode === TARGET_CODE) {
    expectedState = "NO_UPDATE";
    verdict = updateState === "NO_UPDATE" ? "PASS" : "NOT_PUBLISHED";
  } else if (versionCode > TARGET_CODE) {
    expectedState = "NO_UPDATE";
    verdict = updateState === "NO_UPDATE" ? "PASS" : "NOT_PUBLISHED";
  }
  return {
    installedVersionCode: versionCode,
    updateState,
    expectedState,
    targetVersionCode: targetCode,
    targetVersionName: targetName,
    verdict,
  };
}

async function main() {
  const probes = [];
  for (const code of [17, 18, 19, 20, 21, 22, 23, 24]) {
    probes.push(await probe(code));
  }

  let apkIntegrity = {
    url: null,
    httpOk: false,
    expectedSha256: null,
    actualSha256: null,
    sizeBytes: 0,
    verdict: "NOT_PUBLISHED",
  };

  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const url =
      manifest.artifact.downloadUrl ??
      `https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/${manifest.artifact.path}`;
    let buf = Buffer.alloc(0);
    let httpOk = false;
    try {
      const { execFileSync } = await import("node:child_process");
      buf = execFileSync("curl", ["-sL", url], { maxBuffer: 64 * 1024 * 1024 });
      httpOk = buf.length > 1000;
    } catch {
      const dl = await fetch(url, { signal: AbortSignal.timeout(120000) });
      httpOk = dl.ok;
      buf = Buffer.from(await dl.arrayBuffer());
    }
    const actualSha256 = createHash("sha256").update(buf).digest("hex");
    const expectedSha256 = manifest.artifact.sha256;
    apkIntegrity = {
      url,
      httpOk,
      expectedSha256,
      actualSha256,
      sizeBytes: buf.length,
      verdict: httpOk && actualSha256 === expectedSha256 ? "PASS" : "NOT_PUBLISHED",
    };
  }

  const mrpPublished = probes.some((p) => p.installedVersionCode === 22 && p.verdict === "PASS");
  const report = {
    generatedAt: new Date().toISOString(),
    candidate: "RC10.7",
    staging: STAGING,
    mrpStatus: mrpPublished ? "PUBLISHED" : "NOT_PUBLISHED",
    probes,
    apkIntegrityFromMrpUrl: apkIntegrity,
    matrix: [
      { from: "code 17", to: "RC10.7 (code 23)", expected: "OPTIONAL_UPDATE", physical: "NOT_RUN" },
      { from: "code 18", to: "RC10.7 (code 23)", expected: "OPTIONAL_UPDATE", physical: "NOT_RUN" },
      { from: "code 19", to: "RC10.7 (code 23)", expected: "OPTIONAL_UPDATE", physical: "NOT_RUN" },
      { from: "code 20", to: "RC10.7 (code 23)", expected: "OPTIONAL_UPDATE", physical: "NOT_RUN" },
      { from: "RC10.5 (code 21)", to: "RC10.7 (code 23)", expected: "OPTIONAL_UPDATE", physical: "NOT_RUN" },
      { from: "RC10.6 (code 22)", to: "RC10.7 (code 23)", expected: "OPTIONAL_UPDATE", physical: "NOT_RUN" },
      { from: "RC10.7 (code 23)", to: "RC10.7", expected: "NO_UPDATE", physical: "NOT_RUN" },
      { from: "future code 24+", to: "RC10.7", expected: "NO_DOWNGRADE", physical: "NOT_RUN" },
    ],
    verdict: mrpPublished && apkIntegrity.verdict === "PASS" ? "PASS" : "NOT_PUBLISHED",
  };

  mkdirSync(resolve("artifacts/closed-beta-rc10.7"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  writeFileSync(
    UPDATE_API_OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        candidate: "RC10.7",
        targetVersionCode: TARGET_CODE,
        probes,
        apkIntegrity,
        verdict: report.verdict,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ verdict: report.verdict, mrpStatus: report.mrpStatus, probes }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
