#!/usr/bin/env node
/** RC10.9 update matrix — critical bootstrap 24 → target 25 contract. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = resolve("artifacts/closed-beta-rc10.9/update-matrix.json");
const TARGET_CODE = 25;
const BOOTSTRAP_CODE = 24;

async function probe(versionCode) {
  const res = await fetch(`${STAGING}/api/mobile/android/update?versionCode=${versionCode}&channel=BETA`, {
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => ({}));
  const updateState = body.updateState ?? body.state ?? "UNKNOWN";
  const targetCode = body.versionCode ?? null;
  let expectedState = "UNKNOWN";
  let verdict = "FAIL";
  if (versionCode < TARGET_CODE) {
    expectedState = "OPTIONAL_UPDATE";
    verdict = updateState === "OPTIONAL_UPDATE" && targetCode === TARGET_CODE ? "PASS" : "FAIL";
  } else if (versionCode === TARGET_CODE) {
    expectedState = "NO_UPDATE";
    verdict = updateState === "NO_UPDATE" ? "PASS" : "FAIL";
  } else {
    expectedState = "NO_UPDATE";
    verdict = updateState === "NO_UPDATE" ? "PASS" : "FAIL";
  }
  return { installedVersionCode: versionCode, updateState, expectedState, targetVersionCode: targetCode, verdict };
}

async function main() {
  const probes = [];
  for (const code of [21, 22, 23, BOOTSTRAP_CODE, TARGET_CODE, TARGET_CODE + 1]) {
    probes.push(await probe(code));
  }
  const critical = probes.find((p) => p.installedVersionCode === BOOTSTRAP_CODE);

  let downloadProof = { verdict: "NOT_RUN" };
  const manifestPath = resolve("artifacts/closed-beta-rc10.9/build-manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const url = manifest.artifact.proxyUrl;
    const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
    const buf = Buffer.from(await res.arrayBuffer());
    const sha256 = createHash("sha256").update(buf).digest("hex");
    downloadProof = {
      url,
      httpStatus: res.status,
      sizeBytes: buf.length,
      expectedSizeBytes: manifest.artifact.sizeBytes,
      expectedSha256: manifest.artifact.sha256,
      actualSha256: sha256,
      verdict:
        res.ok && sha256 === manifest.artifact.sha256 && buf.length === manifest.artifact.sizeBytes
          ? "PASS"
          : "FAIL",
    };
  }

  mkdirSync(resolve("artifacts/closed-beta-rc10.9"), { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    targetCode: TARGET_CODE,
    bootstrapCode: BOOTSTRAP_CODE,
    criticalContract: {
      probe: `${BOOTSTRAP_CODE} → ${TARGET_CODE}`,
      verdict: critical?.verdict ?? "FAIL",
      updateState: critical?.updateState,
    },
    probes,
    downloadProof,
    overallVerdict: probes.every((p) => p.verdict === "PASS") && downloadProof.verdict === "PASS" ? "PASS" : "FAIL",
  };
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.overallVerdict !== "PASS") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
