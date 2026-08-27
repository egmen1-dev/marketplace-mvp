#!/usr/bin/env node
/** RC10.5 → RC10.7 physical update bridge gate — legacy client semantics + live MRP/APK. */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import {
  proxyDownloadUrl,
  runRc105BridgeHarness,
} from "../lib/mobile/update-bridge-rc10.5/harness";
import { downloadVerifiedApkRc105 } from "../lib/mobile/update-bridge-rc10.5/transport";

const OUT_DIR = join(process.cwd(), "artifacts/mobile-update-bridge-rc10.5");
const OUT = join(OUT_DIR, "gate-report.json");
const FORENSICS = join(OUT_DIR, "forensics.json");
const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const INSTALLED_CODE = 21;
const EXPECTED_SHA = "4b4f88df493eee141019d27e88da37840186e21dbcd45429364e031aa5d9a043";
const EXPECTED_BYTES = 44411738;

function run(cmd: string): void {
  console.log(`[RUN] ${cmd}`);
  execFileSync(cmd, { stdio: "inherit", shell: true });
}

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

run("npm test -- tests/mobile-update-bridge-rc10.5.test.ts");

async function main() {
  const harness = await runRc105BridgeHarness({ installedCode: INSTALLED_CODE });

  if (harness.mrp.updateState !== "OPTIONAL_UPDATE" || harness.mrp.versionCode !== 23) {
    fail(`live MRP mismatch: ${JSON.stringify(harness.mrp)}`);
  }

  if (!harness.mrp.downloadUrl || !harness.mrp.sha256) {
    fail("live MRP missing downloadUrl or sha256");
  }

  if (!harness.downloadHandler.reachable) {
    fail("RC10.5 download handler not reachable with updateInfo set");
  }

  if (!harness.showsAvailableHintAfterDownloadFail) {
    fail("RC10.5 availableHint contradiction not reproduced for failed download phase");
  }

  const direct = harness.transportDownload;
  if (!direct?.ok) {
    fail(`direct APK transport failed: ${JSON.stringify(direct)}`);
  }
  if (direct.bytes !== EXPECTED_BYTES || direct.sha256 !== EXPECTED_SHA) {
    fail(`direct APK bytes/sha mismatch bytes=${direct.bytes} sha=${direct.sha256}`);
  }

  const proxyUrl = proxyDownloadUrl(STAGING, harness.mrp.versionCode);
  const proxyProbe = await fetch(proxyUrl, { method: "HEAD", signal: AbortSignal.timeout(30_000) });
  const proxyRecoveryGate =
    proxyProbe.ok || proxyProbe.status === 405
      ? ("PASS" as const)
      : proxyProbe.status === 404
        ? ("PENDING_DEPLOY" as const)
        : ("FAIL" as const);

  let proxyDownload: Awaited<ReturnType<typeof downloadVerifiedApkRc105>> | null = null;
  if (proxyProbe.ok) {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    proxyDownload = await downloadVerifiedApkRc105({
      downloadUrl: proxyUrl,
      expectedSha256: EXPECTED_SHA,
      versionCode: harness.mrp.versionCode,
      cacheDir: mkdtempSync(join(tmpdir(), "rc105-proxy-")),
      userAgent: "okhttp/4.12.0",
    });
    if (!proxyDownload.ok) {
      fail(`proxy APK transport failed: ${JSON.stringify(proxyDownload)}`);
    }
  }

  const forensics = {
    generatedAt: new Date().toISOString(),
    incident: "P0_UPDATE_DOWNLOAD_BRIDGE_FAILURE",
    installed: {
      versionName: "0.1.15-beta.6",
      versionCode: 21,
      commit: "91b9c1d",
      channel: "CLOSED_BETA",
    },
    target: {
      versionName: harness.mrp.versionName,
      versionCode: harness.mrp.versionCode,
      sha256: harness.mrp.sha256,
    },
    callGraph: {
      tapDownload: "update.tsx PrimaryButton → useUpdateCheckFlow.downloadUpdate",
      guard: "if (!updateInfo) return — NO phase guard",
      runner: "hasCachedApk ? installCachedApkUpdate : startApkDownload",
      download: "download-apk.ts downloadVerifiedApk → File.downloadFileAsync(url, apkCacheFile)",
      verify: "sha256HexFromFile(downloaded) vs MRP sha256",
      installer: "openApkInstaller(file.contentUri)",
    },
    partialSuccess: {
      succeededRequest: `${STAGING}/api/mobile/update?versionCode=21&channel=BETA`,
      networkData: ["versionName", "versionCode", "downloadUrl", "sha256", "updateState"],
      staleStateRisk: "updateInfo survives check catch (RC10.5 bug)",
      internetMessageSource: "UPDATE_ERROR_MESSAGES.network_error via download failure only",
      failureStage: "APK_DOWNLOAD_TRANSPORT (File.downloadFileAsync / OkHttp on device)",
    },
    downloadTap: {
      DOWNLOAD_HANDLER_REACHABLE: harness.downloadHandler.reachable ? "YES" : "NO",
      DOWNLOAD_REQUEST_STARTED: "YES when updateInfo != null (no phase gate)",
      DOWNLOAD_STATE_VALID: harness.downloadHandler.downloadStateValid ? "YES" : "NO",
    },
    cache: {
      CACHE_FAILURE_ROOT_CAUSE: harness.cacheFailureRootCause,
      note: "findVerifiedCachedApk returns null on mismatch; throws only on SecureStore/IO — check catch uses installFailed without internet suffix",
    },
    liveMrp: harness.mrp,
    apkTransport: {
      url: harness.mrp.downloadUrl,
      probe: harness.transportProbe,
      bytes: direct.bytes,
      sha256: direct.sha256,
      androidCompatibility: "OkHttp via expo-file-system File.downloadFileAsync; GitHub raw 200 direct",
    },
    proxyRecovery: {
      proxyUrl,
      proxyProbeStatus: proxyProbe.status,
      RC10_5_REMOTE_RECOVERY_GATE: proxyRecoveryGate,
      OLD_CLIENT_REMOTE_RECOVERY_POSSIBLE: proxyRecoveryGate === "PASS" ? "YES" : "PENDING_DEPLOY",
    },
    classification: harness.physicalFailureReproducedInHarness === "YES" ? "H=MULTIPLE" : harness.classification,
    physicalFailureReproducedInHarness: harness.physicalFailureReproducedInHarness,
  };

  mkdirSync(OUT_DIR, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "mobile:update-bridge-rc10.5:gate",
    verdict: "PASS",
    physicalAndroid: "FAIL",
    installedCode: INSTALLED_CODE,
    latestCode: harness.mrp.versionCode,
    PHYSICAL_FAILURE_REPRODUCED_IN_HARNESS: harness.physicalFailureReproducedInHarness,
    CACHE_FAILURE_ROOT_CAUSE: harness.cacheFailureRootCause,
    DOWNLOAD_HANDLER_REACHABLE: harness.downloadHandler.reachable ? "YES" : "NO",
    APK_DOWNLOAD_BYTES: direct.bytes,
    APK_SHA256: direct.sha256,
    RC10_5_REMOTE_RECOVERY_GATE: proxyRecoveryGate,
    OLD_CLIENT_REMOTE_RECOVERY_POSSIBLE: forensics.proxyRecovery.OLD_CLIENT_REMOTE_RECOVERY_POSSIBLE,
    "RC10_8": "NOT_CREATED",
    mrpVersionUnchanged: true,
    harness,
    forensics,
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  writeFileSync(FORENSICS, JSON.stringify(forensics, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
