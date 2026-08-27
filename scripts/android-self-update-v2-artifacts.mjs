#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "artifacts/android-self-update-v2");

const baseline = {
  generatedAt: new Date().toISOString(),
  epic: "Android Self-Update V2 / Post-Download Hardening",
  forensicInput: {
    HTTP_REQUEST_FROM_DEVICE: "YES",
    NETWORK_DOWNLOAD_SUCCESS: "PROVEN",
    POST_DOWNLOAD_FAILURE: "PROVEN",
    FAILURE_BOUNDARY: "POST_DOWNLOAD",
    RC10_5_REMOTE_RECOVERY: "FAILED",
    MANUAL_BROWSER_BRIDGE: "SUPPORTED",
  },
  installed: { rc: "RC10.5", version: "0.1.15-beta.6", versionCode: 21, commit: "91b9c1d" },
  target: { rc: "RC10.7", version: "0.1.15-beta.8", versionCode: 23, bytes: 44_411_738 },
  PROVEN_ROOT_CAUSE: "NOT_PROVEN",
  primarySuspect: "SHA_VERIFY via full-file arrayBuffer (suspect only)",
};

const currentPipeline = {
  generatedAt: new Date().toISOString(),
  flow: "CTA → downloadUpdate → startApkDownload → cache lookup → File.downloadFileAsync → SHA → content URI → Android installer",
  stages: [
    {
      stage: "UPDATE_CTA",
      input: "user tap",
      output: "downloadUpdate()",
      throws: "silent return if no updateInfo",
      sideEffects: "UPDATE_CTA_PRESS diagnostic",
      stateTransition: "UPDATE_AVAILABLE → DOWNLOAD_PREPARING",
      diagnosticEvent: "UPDATE_CTA_PRESS",
    },
    {
      stage: "CACHE_LOOKUP",
      input: "versionCode + sha256 + artifactSizeBytes",
      output: "CACHE_MISS | CACHE_FOUND | CACHE_VALID | CACHE_INVALID",
      throws: "CACHE_IO → fallback fresh download",
      sideEffects: "may delete corrupted cache file",
      stateTransition: "CACHE_VALID → VERIFIED",
      diagnosticEvent: "CACHE_CHECK_STARTED",
    },
    {
      stage: "HTTP_DOWNLOAD",
      input: "downloadUrl + destination File",
      output: "on-disk APK",
      throws: "DOWNLOAD_NETWORK | DOWNLOAD_HTTP | DOWNLOAD_TIMEOUT",
      sideEffects: "partial file on Android if interrupted",
      stateTransition: "DOWNLOAD_STARTED → DOWNLOAD_PROGRESS → DOWNLOAD_COMPLETE",
      diagnosticEvent: "DOWNLOAD_HTTP_STARTED",
    },
    {
      stage: "INTEGRITY",
      input: "file size + sha256 + artifactSizeBytes",
      output: "verified file or delete + error",
      throws: "VERIFY_SHA_MISMATCH | DOWNLOAD_SIZE_MISMATCH",
      sideEffects: "delete corrupted APK",
      stateTransition: "VERIFYING → VERIFIED",
      diagnosticEvent: "SHA_VERIFY_COMPLETE",
    },
    {
      stage: "INSTALLER",
      input: "verified File.contentUri",
      output: "Android package installer intent",
      throws: "INSTALL_PERMISSION | INSTALL_INTENT",
      sideEffects: "FLAG_GRANT_READ_URI_PERMISSION",
      stateTransition: "INSTALLER_PREPARING → INSTALLER_HANDOFF → INSTALLER_OPENED",
      diagnosticEvent: "INSTALLER_INTENT_OPENED",
    },
  ],
};

const pipelineAfter = {
  ...currentPipeline,
  note: "V2 uses File.open(FileMode.ReadOnly).readBytes(chunk) for SHA — no arrayBuffer",
  shaVerifier: {
    APK_SHA_IMPLEMENTATION: "CHUNKED",
    FULL_FILE_JS_ARRAYBUFFER: "NO",
    chunkBytes: 262144,
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "baseline.json"), JSON.stringify(baseline, null, 2));
writeFileSync(join(OUT, "current-pipeline.json"), JSON.stringify(currentPipeline, null, 2));
writeFileSync(join(OUT, "pipeline-before.json"), JSON.stringify(currentPipeline, null, 2));
writeFileSync(join(OUT, "pipeline-after.json"), JSON.stringify(pipelineAfter, null, 2));
writeFileSync(
  join(OUT, "sha-verifier.json"),
  JSON.stringify(
    {
      APK_SHA_IMPLEMENTATION: "CHUNKED",
      FULL_FILE_JS_ARRAYBUFFER: "NO",
      APK_VERIFY_PEAK_JS_MEMORY_SAFE: "YES",
      mechanism: "Expo FileHandle.readBytes(256KiB) + @noble/hashes incremental SHA256",
    },
    null,
    2,
  ),
);
writeFileSync(
  join(OUT, "state-machine.json"),
  JSON.stringify(
    {
      canonicalPhases: [
        "IDLE",
        "CHECKING",
        "NO_UPDATE",
        "UPDATE_AVAILABLE",
        "DOWNLOAD_PREPARING",
        "DOWNLOAD_STARTED",
        "DOWNLOAD_PROGRESS",
        "DOWNLOAD_COMPLETE",
        "VERIFYING",
        "VERIFIED",
        "INSTALLER_PREPARING",
        "INSTALLER_HANDOFF",
        "INSTALLER_OPENED",
        "INSTALL_PERMISSION_REQUIRED",
        "CHECK_ERROR",
        "DOWNLOAD_ERROR",
        "VERIFY_ERROR",
        "INSTALLER_ERROR",
      ],
      forbidden: "CHECK_ERROR + UPDATE_AVAILABLE CTA without explicit retry",
    },
    null,
    2,
  ),
);
writeFileSync(
  join(OUT, "error-taxonomy.json"),
  JSON.stringify(
    {
      classes: [
        "UPDATE_CHECK_NETWORK",
        "UPDATE_METADATA_INVALID",
        "CACHE_IO",
        "CACHE_CORRUPTED",
        "DOWNLOAD_NETWORK",
        "DOWNLOAD_HTTP",
        "DOWNLOAD_TIMEOUT",
        "DOWNLOAD_FILESYSTEM",
        "DOWNLOAD_SIZE_MISMATCH",
        "VERIFY_IO",
        "VERIFY_SHA_MISMATCH",
        "VERIFY_MEMORY",
        "INSTALL_PERMISSION",
        "INSTALL_CONTENT_URI",
        "INSTALL_INTENT",
        "UNKNOWN",
      ],
    },
    null,
    2,
  ),
);
writeFileSync(
  join(OUT, "installer-audit.json"),
  JSON.stringify(
    {
      openApkInstaller: "IntentLauncher VIEW + contentUri",
      mime: "application/vnd.android.package-archive",
      flag: "FLAG_GRANT_READ_URI_PERMISSION",
      manifest: "REQUEST_INSTALL_PACKAGES",
      unknownSources: "MANAGE_UNKNOWN_APP_SOURCES → INSTALL_PERMISSION_REQUIRED",
    },
    null,
    2,
  ),
);
writeFileSync(
  join(OUT, "journey-matrix.json"),
  JSON.stringify(
    {
      scenarios: "A-R covered in tests/mobile-android-self-update-v2.test.ts + mobile-update-journey.test.ts",
      physicalAndroid: "NOT_RUN",
    },
    null,
    2,
  ),
);
console.log(`[OK] artifacts written to ${OUT}`);
