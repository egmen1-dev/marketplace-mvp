#!/usr/bin/env node
/** RC10.8 bootstrap APK verification — Self-Update V2 symbols + signer compatibility. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_SIGNER = "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c";
const apkPath = process.argv[2] ?? "artifacts/closed-beta-rc10.8/lot_android_closed_beta_0.1.15_beta.9.apk";
const OUT_DIR = resolve("artifacts/closed-beta-rc10.8");
const fullPath = resolve(apkPath);

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

function bundleContains(pattern) {
  try {
    const py = `import sys,zipfile; apk=sys.argv[1]; p=sys.argv[2]; z=zipfile.ZipFile(apk); b=z.read('assets/index.android.bundle'); sys.exit(0 if p.encode() in b else 1)`;
    execFileSync("python3", ["-c", py, fullPath, pattern], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const bytes = readFileSync(fullPath);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const sizeBytes = statSync(fullPath).size;
const aapt = run("aapt", ["dump", "badging", fullPath]);
const apksignerOut = run("apksigner", ["verify", "--print-certs", fullPath]);
const signerSha256 = apksignerOut.match(/SHA-256 digest:\s*([a-f0-9]+)/i)?.[1]?.toLowerCase() ?? "";

const identity = {
  package: aapt.match(/package: name='([^']+)'/)?.[1],
  versionName: aapt.match(/versionName='([^']+)'/)?.[1],
  versionCode: aapt.match(/versionCode='([^']+)'/)?.[1],
  sha256,
  sizeBytes,
};

const v2Symbols = {
  readBytes: bundleContains("readBytes"),
  noArrayBufferVerify: !bundleContains("arrayBuffer()"),
  downloadPreparing: bundleContains("DOWNLOAD_PREPARING"),
  shaVerifyStarted: bundleContains("SHA_VERIFY_STARTED"),
  installPermissionRequired: bundleContains("INSTALL_PERMISSION_REQUIRED"),
  updateActionId: bundleContains("updateActionId") || bundleContains("actionId"),
};

const failures = [];
if (identity.package !== "ru.lot.marketplace.alpha") failures.push("package mismatch");
if (identity.versionCode !== "24") failures.push(`versionCode=${identity.versionCode}`);
if (identity.versionName !== "0.1.15-beta.9") failures.push(`versionName=${identity.versionName}`);
if (signerSha256 !== EXPECTED_SIGNER) failures.push(`signer mismatch ${signerSha256}`);
if (!v2Symbols.readBytes) failures.push("missing readBytes chunked SHA");
if (!v2Symbols.downloadPreparing) failures.push("missing DOWNLOAD_PREPARING state");

mkdirSync(OUT_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  candidate: "RC10.8",
  role: "BOOTSTRAP_FIXED_RC",
  identity,
  signerSha256,
  expectedSignerSha256: EXPECTED_SIGNER,
  signerVerdict: signerSha256 === EXPECTED_SIGNER ? "PASS" : "FAIL",
  v2Symbols,
  verdict: failures.length === 0 ? "PASS" : "FAIL",
  failures,
};
writeFileSync(resolve(OUT_DIR, "apk-feature-verification.json"), JSON.stringify(report, null, 2));
writeFileSync(resolve(OUT_DIR, "signer-verification.json"), JSON.stringify({
  signerSha256,
  expectedSignerSha256: EXPECTED_SIGNER,
  verdict: report.signerVerdict,
}, null, 2));

if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
