#!/usr/bin/env tsx
/** LOT Android release integrity gate — static checks before MRP publish. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { readApkDexAndBundleText, readApkIdentity } from "../lib/mobile/release-integrity/apk-inspect";
import { verifyDiagnosticContractPresent } from "../lib/mobile/release-integrity/diagnostic-contract";
import { describeFailedArtifactPolicy, resolveFailedArtifactPolicy } from "../lib/mobile/release-integrity/failed-artifact-policy";
import { evaluateExpoNativeRegistration } from "../lib/mobile/release-integrity/expo-native-registration";
import { verifyReleaseMetadataGate } from "../lib/mobile/release-integrity/release-metadata-gate";
import { verifySigningLineage } from "../lib/mobile/release-integrity/signing-lineage";
import { verifyUpdaterHashGuard } from "../lib/mobile/release-integrity/updater-hash-guard";

const OUT = resolve("artifacts/mobile-release-integrity/gate-report.json");
const DEFAULT_APK = resolve("artifacts/closed-beta-rc26-local/lot_android_closed_beta_0.1.15_beta.11.apk");
const DEFAULT_MANIFEST = resolve("artifacts/closed-beta-rc26-local/build-manifest.json");

type GateCheck = { name: string; ok: boolean; detail: string };

function fail(msg: string): never {
  console.error(`[release-integrity] FAIL: ${msg}`);
  process.exit(1);
}

function main() {
  const apkPath = resolve(process.argv[2] ?? process.env.RELEASE_INTEGRITY_APK ?? DEFAULT_APK);
  const manifestPath = resolve(process.argv[3] ?? process.env.RELEASE_INTEGRITY_MANIFEST ?? DEFAULT_MANIFEST);
  const checks: GateCheck[] = [];

  if (!existsSync(apkPath)) {
    fail(`APK not found: ${apkPath}`);
  }

  const mobilePkg = JSON.parse(readFileSync("apps/mobile/package.json", "utf8")) as {
    dependencies?: Record<string, string>;
  };

  const updaterGuard = verifyUpdaterHashGuard();
  checks.push({
    name: "UPDATER_CHUNKED_HASH",
    ok: updaterGuard.ok,
    detail: updaterGuard.failures.join("; ") || "chunked readBytes verifier present; no whole-file arrayBuffer in production path",
  });

  const diagnosticSources = [
    readFileSync("lib/mobile/update-journey/error-taxonomy.ts", "utf8"),
    readFileSync("lib/mobile/release-integrity/diagnostic-contract.ts", "utf8"),
    readFileSync("apps/mobile/src/update/download-apk.ts", "utf8"),
    readFileSync("apps/mobile/src/update/apk-sha256.ts", "utf8"),
  ];
  const diagnostics = verifyDiagnosticContractPresent(diagnosticSources);
  checks.push({
    name: "UPDATER_DIAGNOSTICS",
    ok: diagnostics.ok,
    detail: diagnostics.missing.length ? `missing codes: ${diagnostics.missing.join(", ")}` : "required diagnostic codes present",
  });

  const policy = resolveFailedArtifactPolicy();
  checks.push({
    name: "FAILED_ARTIFACT_POLICY",
    ok: true,
    detail: describeFailedArtifactPolicy(policy),
  });

  let apkIdentity;
  let expoVerdict;
  try {
    apkIdentity = readApkIdentity(apkPath);
    const { dexContent, bundleContent } = readApkDexAndBundleText(apkPath);
    expoVerdict = evaluateExpoNativeRegistration({
      declaredDependencies: mobilePkg.dependencies ?? {},
      dexContent,
      bundleContent,
    });
  } catch (err) {
    checks.push({
      name: "EXPO_NATIVE_REGISTRATION",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    expoVerdict = null;
    apkIdentity = null;
  }

  if (expoVerdict) {
    checks.push({
      name: "EXPO_NATIVE_REGISTRATION",
      ok: expoVerdict.ok,
      detail: expoVerdict.failures.join("; ") || `declared=${expoVerdict.declaredPackages.join(",")}`,
    });
    checks.push({
      name: "CLIPBOARD_REGRESSION_DETECTABLE",
      ok: !expoVerdict.clipboardRegression.wouldFailCode24Code25,
      detail: JSON.stringify(expoVerdict.clipboardRegression),
    });
  }

  if (apkIdentity) {
    const signing = verifySigningLineage(apkIdentity.signerSha256);
    checks.push({
      name: "SIGNING_LINEAGE",
      ok: signing.ok,
      detail: `expected=${signing.expected} actual=${signing.actual ?? "unknown"}`,
    });
  }

  if (apkIdentity && existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const metadata = verifyReleaseMetadataGate(apkIdentity, manifest);
    checks.push({
      name: "MRP_METADATA_MATCH",
      ok: metadata.ok,
      detail: metadata.failures.join("; ") || "APK identity matches build manifest",
    });
    checks.push({
      name: "RELEASE_APK_METADATA",
      ok: metadata.ok,
      detail: `package=${apkIdentity.packageName} code=${apkIdentity.versionCode} name=${apkIdentity.versionName}`,
    });
  } else {
    checks.push({
      name: "MRP_METADATA_MATCH",
      ok: false,
      detail: `manifest missing: ${manifestPath}`,
    });
  }

  const nativeAvdResult = process.env.NATIVE_AVD_GATE_RESULT ?? "NOT_RUN";
  checks.push({
    name: "AUTONOMOUS_RELEASE_BOOT",
    ok: nativeAvdResult === "PASS",
    detail:
      nativeAvdResult === "NOT_RUN"
        ? "Cloud/CI cannot run AVD — execute scripts/mobile-native-release-boot-gate.sh on Mac"
        : `NATIVE_AVD_GATE_RESULT=${nativeAvdResult}`,
  });

  const serverDelivery = process.env.SERVER_DELIVERY_GATE_RESULT ?? "NOT_RUN";
  checks.push({
    name: "SERVER_DELIVERY_GATE",
    ok: serverDelivery === "PASS" || serverDelivery === "NOT_RUN",
    detail:
      serverDelivery === "NOT_RUN"
        ? "Run rc{N}-update-api-verification.mjs after publish"
        : `SERVER_DELIVERY_GATE_RESULT=${serverDelivery}`,
  });

  const staticChecks = checks.filter((c) =>
    ["UPDATER_CHUNKED_HASH", "UPDATER_DIAGNOSTICS", "FAILED_ARTIFACT_POLICY", "EXPO_NATIVE_REGISTRATION", "CLIPBOARD_REGRESSION_DETECTABLE", "SIGNING_LINEAGE", "MRP_METADATA_MATCH", "RELEASE_APK_METADATA"].includes(
      c.name,
    ),
  );
  const staticPass = staticChecks.every((c) => c.ok);

  const report = {
    generatedAt: new Date().toISOString(),
    apkPath,
    manifestPath,
    gates: {
      STATIC_GATE: staticPass ? "PASS" : "FAIL",
      NATIVE_AVD_GATE: nativeAvdResult,
      SERVER_DELIVERY_GATE: serverDelivery,
    },
    checklist: {
      RELEASE_APK_METADATA: checks.find((c) => c.name === "RELEASE_APK_METADATA")?.ok ? "PASS" : "FAIL",
      SIGNING_LINEAGE: checks.find((c) => c.name === "SIGNING_LINEAGE")?.ok ? "PASS" : "FAIL",
      EXPO_NATIVE_REGISTRATION: checks.find((c) => c.name === "EXPO_NATIVE_REGISTRATION")?.ok ? "PASS" : "FAIL",
      AUTONOMOUS_BOOT: nativeAvdResult === "PASS" ? "PASS" : "NOT_RUN",
      STARTUP_FATAL: nativeAvdResult === "PASS" ? "NO" : "NOT_RUN",
      UPDATER_CHUNKED_HASH: updaterGuard.ok ? "PASS" : "FAIL",
      UPDATER_DIAGNOSTICS: diagnostics.ok ? "PASS" : "FAIL",
      MRP_METADATA_MATCH: checks.find((c) => c.name === "MRP_METADATA_MATCH")?.ok ? "PASS" : "FAIL",
      READY_FOR_MRP_PUBLISH:
        staticPass && nativeAvdResult === "PASS" && serverDelivery === "PASS" ? "YES" : "NO",
    },
    checks,
    updater: {
      chunkedHashingPresent: updaterGuard.chunkedHashingPresent,
      wholeFileArrayBufferHashing: updaterGuard.wholeFileArrayBufferHashing,
    },
    failedArtifactPolicy: policy,
    verdict: staticPass ? "RELEASE_INTEGRITY_STATIC_PASS" : "RELEASE_INTEGRITY_STATIC_FAIL",
  };

  mkdirSync(resolve("artifacts/mobile-release-integrity"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (!staticPass) process.exit(1);
}

main();
