import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  normalizeSha256Hex,
  sha256HexFromArrayBuffer,
  sha256Matches,
} from "@/lib/mobile/apk-verify/incremental-sha256";

const downloadApk = readFileSync("apps/mobile/src/update/download-apk.ts", "utf8");
const installApk = readFileSync("apps/mobile/src/update/install-apk-android.ts", "utf8");
const cacheSource = readFileSync("apps/mobile/src/update/apk-download-cache.ts", "utf8");
const updateGate = readFileSync("apps/mobile/src/components/UpdateGate.tsx", "utf8");
const updateLabels = readFileSync("apps/mobile/src/update/update-ui-labels.ts", "utf8");
const manifest = readFileSync("apps/mobile/android/app/src/main/AndroidManifest.xml", "utf8");

const APK_PATHS = [
  ["RC10.1", "artifacts/closed-beta-rc10.1/lot_android_closed_beta_0.1.15_beta.2.apk", 17],
  ["RC10.2", "artifacts/closed-beta-rc10.2/lot_android_closed_beta_0.1.15_beta.3.apk", 18],
  ["RC10.3", "artifacts/closed-beta-rc10.3/lot_android_closed_beta_0.1.15_beta.4.apk", 19],
] as const;

function signerSha256(apkPath: string): string {
  const out = execFileSync("apksigner", ["verify", "--print-certs", apkPath], { encoding: "utf8" });
  const match = out.match(/SHA-256 digest:\s*([a-f0-9]+)/i);
  if (!match) throw new Error(`signer not found for ${apkPath}`);
  return match[1].toLowerCase();
}

describe("P0 — Android update install hotfix", () => {
  it("uses in-app download + installer handoff instead of browser-only Linking.openURL", () => {
    expect(downloadApk).toContain("File.downloadFileAsync");
    expect(downloadApk).toContain("openApkInstaller");
    expect(downloadApk).not.toContain("Linking.openURL");
    expect(installApk).toContain("IntentLauncher.startActivityAsync");
    expect(installApk).toContain("application/vnd.android.package-archive");
    expect(manifest).toContain("REQUEST_INSTALL_PACKAGES");
  });

  it("tracks truthful update states and prevents false completion", () => {
    expect(downloadApk).toContain("DOWNLOAD_PREPARING");
    expect(downloadApk).toContain("VERIFIED");
    expect(downloadApk).toContain("INSTALLER_OPENED");
    expect(downloadApk).toContain("UPDATE_ANALYTICS.downloaded");
    expect(updateLabels).toContain("Скачиваем обновление…");
    expect(updateLabels).toContain("Обновление скачано");
    expect(updateLabels).toContain("Подтвердите установку в окне Android");
    expect(updateGate).toContain("findVerifiedCachedApk");
    expect(updateGate).not.toContain("Linking.openURL");
  });

  it("caches verified APK and skips repeated download", () => {
    expect(cacheSource).toContain("findVerifiedCachedApk");
    expect(cacheSource).toContain("SecureStore");
    expect(downloadApk).toContain("fromCache");
    expect(updateLabels).toContain("Обновление уже скачано");
  });

  it("verifies SHA256 before installer handoff", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const expected = createHash("sha256").update(bytes).digest("hex");
    const actual = await sha256HexFromArrayBuffer(bytes.buffer);
    expect(actual).toBe(expected);
    expect(sha256Matches(actual, expected)).toBe(true);
    expect(normalizeSha256Hex("INVALID")).toBeNull();
    expect(downloadApk).toContain("sha256_verify_failed");
    expect(readFileSync("apps/mobile/src/update/apk-sha256.ts", "utf8")).not.toContain("arrayBuffer()");
  });

  it("keeps CLOSED_BETA APK signatures compatible for in-place upgrade", () => {
    const fingerprints = APK_PATHS.map(([label, path]) => ({
      label,
      versionCode: APK_PATHS.find((row) => row[1] === path)?.[2],
      signerSha256: signerSha256(resolve(path)),
      packageName: execFileSync("aapt", ["dump", "badging", resolve(path)], { encoding: "utf8" }).match(
        /package: name='([^']+)'/,
      )?.[1],
    }));

    const unique = new Set(fingerprints.map((row) => row.signerSha256));
    expect(unique.size).toBe(1);
    for (const row of fingerprints) {
      expect(row.packageName).toBe("ru.lot.marketplace.alpha");
    }
    expect(fingerprints.find((row) => row.label === "RC10.2")?.versionCode).toBe(18);
    expect(fingerprints.find((row) => row.label === "RC10.3")?.versionCode).toBe(19);
  });

  it("documents unknown-sources UX", () => {
    expect(installApk).toContain("MANAGE_UNKNOWN_APP_SOURCES");
    expect(updateLabels).toContain("Разрешить");
    expect(downloadApk).toContain("needsUnknownSources");
  });
});
