#!/usr/bin/env node
/** RC7 update API verification + published APK SHA256 match. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = resolve("artifacts/closed-beta-rc7/update-api-verification.json");
const manifest = JSON.parse(readFileSync(resolve("artifacts/closed-beta-rc7/build-manifest.json"), "utf8"));

async function probe(versionCode) {
  const res = await fetch(`${STAGING}/api/mobile/android/update?versionCode=${versionCode}`, {
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => ({}));
  const updateState = body.updateState ?? body.state ?? "UNKNOWN";
  const targetCode = body.versionCode ?? body.release?.versionCode ?? body.targetVersionCode ?? null;
  const targetName = body.versionName ?? body.release?.versionName ?? body.targetVersionName ?? null;
  let verdict = "FAIL";
  if ([7, 8, 9, 10, 11].includes(versionCode)) {
    verdict = updateState === "OPTIONAL_UPDATE" && targetCode === 12 ? "PASS" : "FAIL";
  } else if ([12, 13].includes(versionCode)) {
    verdict = updateState === "NO_UPDATE" ? "PASS" : "FAIL";
  }
  return { installedVersionCode: versionCode, updateState, targetVersionCode: targetCode, targetVersionName: targetName, verdict };
}

async function main() {
  const probes = [];
  for (const code of [7, 8, 9, 10, 11, 12, 13]) {
    probes.push(await probe(code));
  }

  const url = manifest.artifact.downloadUrl ??
    `https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/${manifest.artifact.path}`;
  const dl = await fetch(url, { signal: AbortSignal.timeout(120000) });
  const buf = Buffer.from(await dl.arrayBuffer());
  const actualSha256 = createHash("sha256").update(buf).digest("hex");
  const expectedSha256 = manifest.artifact.sha256;
  const httpOk = dl.ok;

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    probes,
    apkIntegrityFromMrpUrl: {
      url,
      httpOk,
      expectedSha256,
      actualSha256,
      sizeBytes: buf.length,
      verdict: httpOk && actualSha256 === expectedSha256 ? "PASS" : "FAIL",
    },
    verdict: probes.every((p) => p.verdict === "PASS") && httpOk && actualSha256 === expectedSha256 ? "PASS" : "FAIL",
  };

  mkdirSync(resolve("artifacts/closed-beta-rc7"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, probes: probes.length, shaMatch: actualSha256 === expectedSha256 }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
