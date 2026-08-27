import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  APK_SHA_CHUNK_BYTES,
  createIncrementalSha256,
  sha256HexFromChunkIterable,
  sha256Matches,
} from "@/lib/mobile/apk-verify/incremental-sha256";
import { describeUpdateError, mapThrownError } from "@/lib/mobile/update-journey/error-taxonomy";
import {
  buildUpdateScreenUiContract,
  completeUpdateCheck,
  beginUpdateCheck,
  failDownload,
  failVerify,
  hasUpdateContradiction,
  requireInstallPermission,
} from "@/lib/mobile/update-journey/update-state";

const apkShaSource = readFileSync("apps/mobile/src/update/apk-sha256.ts", "utf8");
const downloadApkSource = readFileSync("apps/mobile/src/update/download-apk.ts", "utf8");
const cacheSource = readFileSync("apps/mobile/src/update/apk-download-cache.ts", "utf8");
const installSource = readFileSync("apps/mobile/src/update/install-apk-android.ts", "utf8");
const updateScreenSource = readFileSync("apps/mobile/app/update.tsx", "utf8");
const updateFlowSource = readFileSync("apps/mobile/src/hooks/useUpdateCheckFlow.ts", "utf8");
const diagnosticsSource = readFileSync("apps/mobile/src/update/journey-diagnostics.ts", "utf8");

const RC107_APK = resolve("artifacts/closed-beta-rc10.7/lot_android_closed_beta_0.1.15_beta.8.apk");
const RC107_SHA = "4b4f88df493eee141019d27e88da37840186e21dbcd45429364e031aa5d9a043";
const RC107_BYTES = 44_411_738;

async function nodeSha256Hex(path: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolvePromise(hash.digest("hex")))
      .on("error", reject);
  });
}

async function nodeChunkIterable(path: string, chunkSize = APK_SHA_CHUNK_BYTES): AsyncIterable<Uint8Array> {
  const handle = await import("node:fs/promises").then((fs) => fs.open(path, "r"));
  return {
    async *[Symbol.asyncIterator]() {
      try {
        const buffer = Buffer.alloc(chunkSize);
        while (true) {
          const { bytesRead } = await handle.read(buffer, 0, chunkSize, null);
          if (bytesRead <= 0) break;
          yield new Uint8Array(buffer.subarray(0, bytesRead));
        }
      } finally {
        await handle.close();
      }
    },
  };
}

const RELEASE = {
  versionName: "0.1.15-beta.8",
  versionCode: 23,
  sha256: RC107_SHA,
  downloadUrl: "https://example.com/apk",
  artifactSizeBytes: RC107_BYTES,
};

describe("Android self-update V2 — memory contract", () => {
  it("P — forbids full-file arrayBuffer in APK verification path", () => {
    expect(apkShaSource).not.toContain("arrayBuffer()");
    expect(apkShaSource).toContain("readBytes");
    expect(apkShaSource).toContain("FileMode.ReadOnly");
    expect(downloadApkSource).not.toMatch(/sha256HexFromFile[\s\S]*arrayBuffer/);
    expect(cacheSource).not.toContain("arrayBuffer()");
  });

  it("P — chunked SHA matches Node crypto for 44MB APK when artifact present", async () => {
    try {
      readFileSync(RC107_APK);
    } catch {
      console.warn("[SKIP] RC10.7 APK not present in workspace");
      return;
    }
    const expected = await nodeSha256Hex(RC107_APK);
    const chunked = await sha256HexFromChunkIterable(await nodeChunkIterable(RC107_APK));
    expect(chunked).toBe(expected);
    expect(chunked).toBe(RC107_SHA);
    expect(sha256Matches(chunked, RC107_SHA)).toBe(true);
  });

  it("P — incremental hasher uses bounded chunk size", () => {
    expect(APK_SHA_CHUNK_BYTES).toBe(256 * 1024);
    const hasher = createIncrementalSha256();
    hasher.update(new Uint8Array([1, 2, 3]));
    expect(hasher.digestHex()).toHaveLength(64);
  });
});

describe("Android self-update V2 — journey matrix", () => {
  it("A — update available path has no contradiction", () => {
    const snapshot = completeUpdateCheck(beginUpdateCheck(1), {
      eligible: true,
      release: RELEASE,
      hasCachedApk: false,
    });
    const ui = buildUpdateScreenUiContract(snapshot);
    expect(ui.showUpdateAvailable).toBe(true);
    expect(hasUpdateContradiction(snapshot)).toBe(false);
  });

  it("B — network failure before bytes maps to check error", () => {
    const snapshot = {
      ...beginUpdateCheck(1),
      phase: "DOWNLOAD_ERROR" as const,
      availableRelease: RELEASE,
      errorStage: "download" as const,
      errorMessage: describeUpdateError("DOWNLOAD_NETWORK").message,
      errorClass: "DOWNLOAD_NETWORK",
    };
    const ui = buildUpdateScreenUiContract(snapshot);
    expect(ui.showDownloadError).toBe(true);
    expect(ui.errorTitle).toContain("скачать");
    expect(ui.errorTitle).not.toContain("интернет и попробуйте позже");
  });

  it("E — SHA mismatch is VERIFY_ERROR with verify copy", () => {
    let snapshot = completeUpdateCheck(beginUpdateCheck(1), {
      eligible: true,
      release: RELEASE,
      hasCachedApk: false,
    });
    snapshot = failVerify(snapshot, describeUpdateError("VERIFY_SHA_MISMATCH").message, "VERIFY_SHA_MISMATCH");
    const ui = buildUpdateScreenUiContract(snapshot);
    expect(ui.showVerifyError).toBe(true);
    expect(ui.showDownloadCta).toBe(true);
    expect(ui.errorTitle).not.toContain("интернет");
  });

  it("J — install permission required is distinct from download error", () => {
    let snapshot = completeUpdateCheck(beginUpdateCheck(1), {
      eligible: true,
      release: RELEASE,
      hasCachedApk: true,
    });
    snapshot = requireInstallPermission(snapshot, describeUpdateError("INSTALL_PERMISSION").message);
    const ui = buildUpdateScreenUiContract(snapshot);
    expect(ui.showInstallPermission).toBe(true);
    expect(ui.showAllowInstallCta).toBe(true);
    expect(ui.showDownloadError).toBe(false);
  });

  it("Q — no contradictory UI states for check error", () => {
    const snapshot = {
      ...beginUpdateCheck(1),
      phase: "CHECK_ERROR" as const,
      availableRelease: null,
      errorStage: "check" as const,
      errorMessage: "fail",
      errorClass: "UPDATE_CHECK_NETWORK",
    };
    expect(hasUpdateContradiction(snapshot)).toBe(false);
    const ui = buildUpdateScreenUiContract(snapshot);
    expect(ui.showUpdateAvailable).toBe(false);
    expect(ui.showDownloadCta).toBe(false);
  });

  it("R — download error CTA is explicit retry", () => {
    let snapshot = completeUpdateCheck(beginUpdateCheck(1), {
      eligible: true,
      release: RELEASE,
      hasCachedApk: false,
    });
    snapshot = failDownload(snapshot, describeUpdateError("DOWNLOAD_NETWORK").message, "DOWNLOAD_NETWORK");
    const ui = buildUpdateScreenUiContract(snapshot);
    expect(ui.showRetry).toBe(true);
    expect(ui.showDownloadCta).toBe(true);
    expect(hasUpdateContradiction(snapshot)).toBe(false);
  });
});

describe("Android self-update V2 — wiring contracts", () => {
  it("download pipeline uses progress callback and size validation", () => {
    expect(downloadApkSource).toContain("onProgress");
    expect(downloadApkSource).toContain("artifactSizeBytes");
    expect(downloadApkSource).toContain("SHA_VERIFY_STARTED");
    expect(downloadApkSource).toContain("INSTALL_PERMISSION_REQUIRED");
  });

  it("cache hardening exposes explicit states", () => {
    expect(cacheSource).toContain("CACHE_MISS");
    expect(cacheSource).toContain("CACHE_VALID");
    expect(cacheSource).toContain("CACHE_INVALID");
    expect(cacheSource).toContain("CACHE_DELETE_FAILED");
  });

  it("installer audit covers FileProvider handoff", () => {
    expect(installSource).toContain("contentUri");
    expect(installSource).toContain("application/vnd.android.package-archive");
    expect(installSource).toContain("FLAG_GRANT_READ_URI_PERMISSION");
  });

  it("diagnostics V2 events are defined", () => {
    expect(diagnosticsSource).toContain("UPDATE_CTA_PRESS");
    expect(diagnosticsSource).toContain("DOWNLOAD_PROGRESS");
    expect(diagnosticsSource).toContain("SHA_VERIFY_COMPLETE");
    expect(diagnosticsSource).toContain("INSTALL_PERMISSION_REQUIRED");
    expect(diagnosticsSource).toContain("actionId");
  });

  it("update screen derives from canonical ui contract only", () => {
    expect(updateScreenSource).toContain("ui.showVerifying");
    expect(updateScreenSource).toContain("ui.showInstallPermission");
    expect(updateScreenSource).not.toContain("hasUpdate && phase");
  });

  it("update flow wires V2 state transitions", () => {
    expect(updateFlowSource).toContain("applyDownloadFlowState");
    expect(updateFlowSource).toContain("UPDATE_CTA_PRESS");
    expect(updateFlowSource).toContain("artifactSizeBytes");
  });

  it("error taxonomy maps thrown verify failures", () => {
    expect(mapThrownError(new Error("sha256_verify_failed"))).toBe("VERIFY_SHA_MISMATCH");
    expect(mapThrownError(new Error("size_mismatch"))).toBe("DOWNLOAD_SIZE_MISMATCH");
    expect(describeUpdateError("VERIFY_SHA_MISMATCH").message).not.toContain("интернет");
  });
});
