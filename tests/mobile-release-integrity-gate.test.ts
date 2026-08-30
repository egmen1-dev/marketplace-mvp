import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  APK_SHA_CHUNK_BYTES,
  createIncrementalSha256,
  sha256HexFromChunkIterable,
} from "@/lib/mobile/apk-verify/incremental-sha256";
import {
  buildVerifyMismatchDiagnostics,
  mapVerifyIoSubtype,
  verifyDiagnosticContractPresent,
} from "@/lib/mobile/release-integrity/diagnostic-contract";
import { evaluateExpoNativeRegistration } from "@/lib/mobile/release-integrity/expo-native-registration";
import { verifyReleaseMetadataGate, type ReleaseManifestLike } from "@/lib/mobile/release-integrity/release-metadata-gate";
import { verifySigningLineage, LOT_CLOSED_BETA_SIGNER_SHA256 } from "@/lib/mobile/release-integrity/signing-lineage";
import { verifyUpdaterHashGuard } from "@/lib/mobile/release-integrity/updater-hash-guard";
import { mapThrownError } from "@/lib/mobile/update-journey/error-taxonomy";

const RC26_APK = resolve("artifacts/closed-beta-rc26-local/lot_android_closed_beta_0.1.15_beta.11.apk");
const RC26_SHA = "cbc3c75d5967241f15a19a01519bf617bd6119da11d6748da0d9015dc8334cd4";
const RC26_BYTES = 43_944_762;

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

describe("release integrity — Expo native registration", () => {
  it("fails when declared expo-clipboard has no native registration", () => {
    const verdict = evaluateExpoNativeRegistration({
      declaredDependencies: { "expo-clipboard": "~57.0.1" },
      dexContent: "expo.modules.filesystem",
      bundleContent: "expo-clipboard",
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.clipboardRegression.wouldFailCode24Code25).toBe(true);
  });

  it("detects CODE24/CODE25 clipboard class failure fixture", () => {
    const verdict = evaluateExpoNativeRegistration({
      declaredDependencies: { "expo-clipboard": "~57.0.1" },
      dexContent: "",
      bundleContent: "from 'expo-clipboard'",
    });
    expect(verdict.clipboardRegression.wouldFailCode24Code25).toBe(true);
    expect(verdict.failures.some((f) => f.includes("CODE24_CODE25_CLIPBOARD"))).toBe(true);
  });

  it("passes when clipboard native module is registered", () => {
    const verdict = evaluateExpoNativeRegistration({
      declaredDependencies: { "expo-clipboard": "~57.0.1", "expo-file-system": "~57.0.3" },
      dexContent: "ExpoClipboardModule expo.modules.clipboard FileSystemModule expo.modules.filesystem",
      bundleContent: "expo-clipboard expo-file-system",
    });
    expect(verdict.ok).toBe(true);
    expect(verdict.clipboardRegression.wouldFailCode24Code25).toBe(false);
  });
});

const HAS_RC26_APK = existsSync(RC26_APK);

describe("release integrity — updater chunked hash", () => {
  it("guards production verifier against whole-file arrayBuffer hashing", () => {
    const guard = verifyUpdaterHashGuard();
    expect(guard.chunkedHashingPresent).toBe(true);
    expect(guard.wholeFileArrayBufferHashing).toBe(false);
    expect(guard.ok).toBe(true);
  });

  it.skipIf(!HAS_RC26_APK)("hashes canonical RC26 APK with chunked iterator", async () => {
    const hash = await sha256HexFromChunkIterable(await nodeChunkIterable(RC26_APK));
    expect(hash).toBe(RC26_SHA);
  });

  it.skipIf(!HAS_RC26_APK)("fails VERIFY_MISMATCH on single-byte mutation", async () => {
    const dir = join(tmpdir(), `lot-rc26-mut-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const mutated = join(dir, "mutated.apk");
    copyFileSync(RC26_APK, mutated);
    const buf = readFileSync(mutated);
    buf[buf.length - 1] ^= 0xff;
    writeFileSync(mutated, buf);
    const hash = await sha256HexFromChunkIterable(await nodeChunkIterable(mutated));
    expect(hash).not.toBe(RC26_SHA);
    const diag = buildVerifyMismatchDiagnostics({
      expectedSha: RC26_SHA,
      actualSha: hash,
      downloadedByteSize: buf.length,
      targetVersionCode: 26,
    });
    expect(diag.errorClass).toBe("VERIFY_SHA_MISMATCH");
  });

  it.skipIf(!HAS_RC26_APK)("fails VERIFY_MISMATCH on truncated artifact", async () => {
    const dir = join(tmpdir(), `lot-rc26-trunc-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const truncated = join(dir, "truncated.apk");
    const buf = readFileSync(RC26_APK);
    writeFileSync(truncated, buf.subarray(0, buf.length - 1024));
    const hash = await sha256HexFromChunkIterable(await nodeChunkIterable(truncated));
    expect(hash).not.toBe(RC26_SHA);
  });

  it("maps read failure to VERIFY_IO or SHA_API_UNAVAILABLE", () => {
    expect(mapVerifyIoSubtype("readBytes not supported")).toBe("SHA_API_UNAVAILABLE");
    expect(mapThrownError(new Error("verify_io_failed"))).toBe("VERIFY_IO");
  });
});

describe("release integrity — release metadata gate", () => {
  const baseApk = {
    packageName: "ru.lot.marketplace.alpha",
    versionCode: 26,
    versionName: "0.1.15-beta.11",
    sizeBytes: RC26_BYTES,
    sha256: RC26_SHA,
    signerSha256: LOT_CLOSED_BETA_SIGNER_SHA256,
  };

  const manifest: ReleaseManifestLike = {
    packageName: "ru.lot.marketplace.alpha",
    versionCode: 26,
    versionName: "0.1.15-beta.11",
    artifact: { sha256: RC26_SHA, sizeBytes: RC26_BYTES },
  };

  it("passes when APK metadata matches manifest", () => {
    expect(verifyReleaseMetadataGate(baseApk, manifest).ok).toBe(true);
  });

  it("fails on SHA mismatch", () => {
    const verdict = verifyReleaseMetadataGate(
      { ...baseApk, sha256: "0".repeat(64) },
      manifest,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.failures.some((f) => f.startsWith("sha256"))).toBe(true);
  });

  it("fails on versionCode mismatch", () => {
    const verdict = verifyReleaseMetadataGate({ ...baseApk, versionCode: 25 }, manifest);
    expect(verdict.ok).toBe(false);
    expect(verdict.failures.some((f) => f.startsWith("versionCode"))).toBe(true);
  });
});

describe("release integrity — signing lineage", () => {
  it("fails on signing certificate mismatch", () => {
    expect(verifySigningLineage("deadbeef".repeat(8)).ok).toBe(false);
  });

  it("passes on LOT closed beta signer", () => {
    expect(verifySigningLineage(LOT_CLOSED_BETA_SIGNER_SHA256).ok).toBe(true);
  });
});

describe("release integrity — diagnostic contract", () => {
  it("requires updater diagnostic codes in source", () => {
    const sources = [
      readFileSync("lib/mobile/update-journey/error-taxonomy.ts", "utf8"),
      readFileSync("lib/mobile/release-integrity/diagnostic-contract.ts", "utf8"),
    ];
    const result = verifyDiagnosticContractPresent(sources);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

describe("release integrity — incremental hasher sanity", () => {
  it("produces stable digest across chunk boundaries", () => {
    const data = new Uint8Array(APK_SHA_CHUNK_BYTES * 2 + 17);
    data.fill(7);
    const whole = createHash("sha256").update(data).digest("hex");
    const hasher = createIncrementalSha256();
    hasher.update(data.subarray(0, APK_SHA_CHUNK_BYTES));
    hasher.update(data.subarray(APK_SHA_CHUNK_BYTES, APK_SHA_CHUNK_BYTES * 2));
    hasher.update(data.subarray(APK_SHA_CHUNK_BYTES * 2));
    expect(hasher.digestHex()).toBe(whole);
  });
});
