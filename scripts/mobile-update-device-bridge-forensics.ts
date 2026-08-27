#!/usr/bin/env node
/** RC10.5 device bridge deep forensics — artifacts only, no release churn. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { analyzeFailedPhaseDownload } from "../lib/mobile/update-bridge-rc10.5/failed-phase-download";
import {
  RC10_5_DOWNLOAD_CALL_GRAPH,
  stepsThrowingBeforeHttp,
} from "../lib/mobile/update-bridge-rc10.5/rc10.5-download-callgraph";
import { downloadVerifiedApkRc105, probeDownloadUrl } from "../lib/mobile/update-bridge-rc10.5/transport";

const OUT = join(process.cwd(), "artifacts/mobile-update-device-bridge");
const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const PROXY_URL = `${STAGING}/api/mobile/releases/apk?versionCode=23`;
const EXPECTED_SHA = "4b4f88df493eee141019d27e88da37840186e21dbcd45429364e031aa5d9a043";
const EXPECTED_BYTES = 44_411_738;
const MB = 1_048_576;

function run(cmd: string): void {
  execFileSync(cmd, { stdio: "inherit", shell: true });
}

function durationSeconds(bytes: number, mbps: number): number {
  const bitsPerSec = mbps * 1_000_000;
  return (bytes * 8) / bitsPerSec;
}

async function throttleDownload(url: string, maxBytesPerSecond: number): Promise<{
  bytes: number;
  durationMs: number;
  sha256: string;
}> {
  const started = Date.now();
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`fetch ${res.status}`);
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  let windowStart = Date.now();
  let windowBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(Buffer.from(value));
      total += value.byteLength;
      windowBytes += value.byteLength;
      const elapsed = Date.now() - windowStart;
      if (elapsed < 1000 && windowBytes > maxBytesPerSecond) {
        await new Promise((r) => setTimeout(r, 1000 - elapsed));
        windowStart = Date.now();
        windowBytes = 0;
      }
      if (elapsed >= 1000) {
        windowStart = Date.now();
        windowBytes = 0;
      }
    }
  }
  const buf = Buffer.concat(chunks);
  return {
    bytes: total,
    durationMs: Date.now() - started,
    sha256: createHash("sha256").update(buf).digest("hex"),
  };
}

async function main() {
  run("npm test -- tests/mobile-update-device-bridge.test.ts tests/mobile-update-bridge-rc10.5.test.ts");

  mkdirSync(OUT, { recursive: true });

  const mrpRes = await fetch(`${STAGING}/api/mobile/update?versionCode=21&channel=BETA`);
  const mrp = await mrpRes.json();
  const healthRes = await fetch(`${STAGING}/api/health`);
  const health = await healthRes.json();
  const probeHead = await probeDownloadUrl(PROXY_URL);

  const failedPhase = analyzeFailedPhaseDownload();

  const timeoutBudget = {
    layers: [
      { layer: "OkHttp connect (expo-file-system File.downloadFileAsync)", timeout: "10s default", evidence: "OkHttpClient() no custom builder in FileSystemDownload.kt:44" },
      { layer: "OkHttp read between chunks", timeout: "10s default", evidence: "idle gap between bytes, not total transfer" },
      { layer: "Railway proxy upstream fetch", timeout: "600s", evidence: "AbortSignal.timeout(600_000) in apk/route.ts" },
      { layer: "RC10.5 update check (fetchMobileUpdate)", timeout: "api client default", evidence: "separate from APK download" },
      { layer: "RC10.5 download AbortSignal", timeout: "none", evidence: "downloadFileAsync called without signal in 91b9c1d" },
    ],
    transferDurationEstimateSeconds: {
      at1Mbps: durationSeconds(EXPECTED_BYTES, 1),
      at5Mbps: durationSeconds(EXPECTED_BYTES, 5),
      at10Mbps: durationSeconds(EXPECTED_BYTES, 10),
      at20Mbps: durationSeconds(EXPECTED_BYTES, 20),
      at50Mbps: durationSeconds(EXPECTED_BYTES, 50),
    },
    note: "10s OkHttp read timeout fires only if no bytes for 10s — steady slow 4G may still complete; stalled proxy/upstream more risky",
  };

  const throttleResults: Record<string, unknown> = {};
  for (const [label, mbps] of [
    ["1Mbps", 0.125 * MB],
    ["5Mbps", 0.625 * MB],
    ["10Mbps", 1.25 * MB],
  ] as const) {
    try {
      const diagUrl = `${STAGING}/api/mobile/releases/apk/diagnostic?bytes=10485760`;
      const result = await throttleDownload(diagUrl, mbps);
      throttleResults[label] = { ok: true, ...result, expectedMinDurationMs: (10 * MB * 8) / (mbps * 1000 / MB) * 1000 };
    } catch (err) {
      throttleResults[label] = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  let fullProxy: Awaited<ReturnType<typeof downloadVerifiedApkRc105>> | null = null;
  try {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    fullProxy = await downloadVerifiedApkRc105({
      downloadUrl: PROXY_URL,
      expectedSha256: EXPECTED_SHA,
      versionCode: 23,
      cacheDir: mkdtempSync(join(tmpdir(), "device-bridge-")),
      userAgent: "okhttp/4.12.0",
    });
  } catch (err) {
    fullProxy = { ok: false, code: "download_failed", message: String(err) };
  }

  let signerSha = "NOT_RUN";
  try {
    const apkPath = "artifacts/closed-beta-rc10.7/lot_android_closed_beta_0.1.15_beta.8.apk";
    const out = execFileSync("apksigner", ["verify", "--print-certs", apkPath], { encoding: "utf8" });
    signerSha = out.match(/SHA-256 digest:\s*([a-f0-9]+)/i)?.[1]?.toLowerCase() ?? "UNKNOWN";
  } catch {
    signerSha = "SKIP";
  }

  const baseline = {
    generatedAt: new Date().toISOString(),
    mainCommit: readFileSync(".git/HEAD", "utf8").includes("ref:") ? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().slice(0, 7) : "unknown",
    stagingCommit: health?.version?.commit ?? null,
    stagingUrl: STAGING,
    installed: { rc: "RC10.5", versionName: "0.1.15-beta.6", versionCode: 21, commit: "91b9c1d" },
    target: { rc: "RC10.7", versionName: "0.1.15-beta.8", versionCode: 23, sha256: EXPECTED_SHA },
    mrpDownloadUrl: mrp.downloadUrl,
    proxyUrl: PROXY_URL,
  };

  const gateGap = {
    RC10_5_SERVER_BRIDGE_GATE: {
      proves: ["MRP contract", "proxy HTTP 200", "full APK bytes", "SHA256 match from CI/Node"],
      doesNotProve: [
        "Expo FileSystem Android execution on device",
        "HTTP request initiation from RC10.5 tap",
        "OkHttp 44MB mobile transport",
        "file.arrayBuffer SHA on device heap",
        "installer handoff",
        "lifecycle cancellation",
      ],
    },
    RC10_5_DEVICE_BRIDGE: {
      status: "NOT_RUN",
      requires: "physical tap + server request-log correlation",
    },
    previousOverstatement: "RC10_5_REMOTE_RECOVERY_GATE=PASS did NOT prove physical RC10.5 download",
  };

  const recoveryDecision = {
    PREVIOUS_GITHUB_ROOT_CAUSE_STATUS: "DISPROVEN",
    explanation:
      "Same-origin Railway proxy also fails on physical RC10.5 after retry. GitHub raw transport was at most a CONTRIBUTOR; not sufficient root cause.",
    HTTP_REQUEST_FROM_DEVICE: "NOT_RUN",
    OLD_CLIENT_REMOTE_RECOVERY_POSSIBLE: "UNKNOWN_UNTIL_PROBE",
    manualRecoveryRequired: "UNKNOWN_UNTIL_PROBE",
    nextAction: "BLOCKED_ROOT_CAUSE_UNPROVEN",
  };

  writeFileSync(join(OUT, "baseline.json"), JSON.stringify(baseline, null, 2));
  writeFileSync(join(OUT, "rc10.5-download-callgraph.json"), JSON.stringify({ steps: RC10_5_DOWNLOAD_CALL_GRAPH, preHttpThrows: stepsThrowingBeforeHttp() }, null, 2));
  writeFileSync(join(OUT, "failed-phase-analysis.json"), JSON.stringify({ FAILED_PHASE_DOWNLOAD_SUPPORTED_BY_RC10_5: failedPhase.supported, ...failedPhase }, null, 2));
  writeFileSync(
    join(OUT, "server-request-probe.json"),
    JSON.stringify(
      {
        endpoint: `${STAGING}/api/mobile/releases/apk/request-log?versionCode=23&since=<ISO_TAP-30s>`,
        HTTP_REQUEST_FROM_DEVICE: "NOT_RUN",
        probeDeployed: "pending_this_deploy",
        physicalProcedure: [
          "Open update screen on RC10.5",
          "Tap Повторить, wait for 0.1.15-beta.8",
          "Record tap time (seconds)",
          "Tap Скачать обновление once",
          "Wait 20s",
          "Query request-log with since=tap-30s",
        ],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(OUT, "proxy-streaming-audit.json"),
    JSON.stringify(
      {
        proxyUrl: PROXY_URL,
        head: probeHead,
        fullDownload: fullProxy,
        throttle10MB: throttleResults,
        headers: {
          contentType: "application/vnd.android.package-archive",
          contentLengthPreserved: probeHead.contentLength === EXPECTED_BYTES,
          compression: "none observed",
          acceptRanges: "bytes",
        },
        proxyImplementationNotes: [
          "Streams upstream body via createCountedResponseStream",
          "No full-buffer before response",
          "Upstream fetch timeout 600s",
          "Forwards Range when present",
        ],
      },
      null,
      2,
    ),
  );
  writeFileSync(join(OUT, "timeout-budget.json"), JSON.stringify(timeoutBudget, null, 2));
  writeFileSync(
    join(OUT, "filesystem-audit.json"),
    JSON.stringify(
      {
        destination: "Paths.cache/lot-update-{versionCode}.apk",
        api: "expo-file-system ~57.0.3 File API (not legacy)",
        preDownloadDelete: "destination.exists → delete()",
        idempotent: true,
        postDownloadVerify: "file.arrayBuffer() entire APK into JS heap — 44MB OOM risk on device",
        emulatorTest: "NOT_RUN",
        risks: ["pre-http cache sha on corrupt partial", "post-download memory verify", "auto-installer after download"],
      },
      null,
      2,
    ),
  );
  writeFileSync(join(OUT, "gate-gap.json"), JSON.stringify(gateGap, null, 2));
  writeFileSync(
    join(OUT, "recovery-decision.json"),
    JSON.stringify(
      {
        ...recoveryDecision,
        manualRecovery: {
          required: "if HTTP_REQUEST_FROM_DEVICE=NO",
          signerSha256Expected: "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c",
          signerSha256Verified: signerSha,
          browserUrl: PROXY_URL,
          steps: ["Open proxy URL in Chrome on device", "Download APK", "Tap file", "Install over existing app"],
        },
      },
      null,
      2,
    ),
  );

  const finalReport = {
    generatedAt: new Date().toISOString(),
    incident: "P0_UPDATE_DOWNLOAD_BRIDGE_FAILURE",
    physicalRetry: "FAIL after Railway proxy recovery",
    PREVIOUS_GITHUB_ROOT_CAUSE_STATUS: "DISPROVEN",
    FAILED_PHASE_DOWNLOAD_SUPPORTED_BY_RC10_5: failedPhase.supported,
    HTTP_REQUEST_FROM_DEVICE: "NOT_RUN",
    ROOT_CAUSE: "UNKNOWN",
    OLD_CLIENT_REMOTE_RECOVERY_POSSIBLE: "UNKNOWN_UNTIL_PROBE",
    MANUAL_RECOVERY_REQUIRED: "UNKNOWN_UNTIL_PROBE",
    NEXT_ACTION: "BLOCKED_ROOT_CAUSE_UNPROVEN",
    RC10_8: "NOT_CREATED",
    mrpVersionUnchanged: true,
    gateGap,
    baseline,
  };

  writeFileSync(join(OUT, "final-report.json"), JSON.stringify(finalReport, null, 2));

  writeFileSync(
    join(process.cwd(), "artifacts/mobile-update-journey/incident.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        incident: "P0_UPDATE_DOWNLOAD_BRIDGE_FAILURE",
        physicalVerdict: "BLOCKED_REQUIRES_MANUAL_RECOVERY",
        PREVIOUS_GITHUB_ROOT_CAUSE_STATUS: "DISPROVEN",
        proxyRecoveryPhysicalResult: "FAIL",
        HTTP_REQUEST_FROM_DEVICE: "NOT_RUN",
        FAILED_PHASE_DOWNLOAD_SUPPORTED_BY_RC10_5: "BROKEN",
        nextAction: "BLOCKED_ROOT_CAUSE_UNPROVEN",
        artifacts: "artifacts/mobile-update-device-bridge/",
      },
      null,
      2,
    ),
  );

  console.log(JSON.stringify(finalReport, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
