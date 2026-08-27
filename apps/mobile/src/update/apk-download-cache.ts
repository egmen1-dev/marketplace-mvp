import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";

import type { UpdateErrorClass } from "../../../../lib/mobile/update-journey/error-taxonomy";
import { normalizeSha256Hex, sha256HexFromFile, sha256Matches } from "./apk-sha256";

const CACHE_KEY = "lot_apk_update_cache_v1";

export type ApkCacheState =
  | "CACHE_MISS"
  | "CACHE_FOUND"
  | "CACHE_VERIFYING"
  | "CACHE_VALID"
  | "CACHE_INVALID"
  | "CACHE_DELETE_FAILED";

export type ApkDownloadCacheEntry = {
  versionCode: number;
  versionName: string;
  fileUri: string;
  sha256: string;
  downloadedAt: string;
};

export type CacheLookupResult =
  | { state: "CACHE_MISS" }
  | { state: "CACHE_FOUND"; file: File }
  | { state: "CACHE_VALID"; file: File }
  | { state: "CACHE_INVALID"; reason: UpdateErrorClass }
  | { state: "CACHE_DELETE_FAILED"; reason: UpdateErrorClass };

export function apkCacheFile(versionCode: number): File {
  return new File(Paths.cache, `lot-update-${versionCode}.apk`);
}

export async function loadApkDownloadCache(): Promise<ApkDownloadCacheEntry | null> {
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApkDownloadCacheEntry;
    if (!parsed?.versionCode || !parsed.fileUri || !parsed.sha256) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveApkDownloadCache(entry: ApkDownloadCacheEntry): Promise<void> {
  await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(entry));
}

export async function clearApkDownloadCache(): Promise<void> {
  await SecureStore.deleteItemAsync(CACHE_KEY);
}

export async function deleteApkFile(file: File): Promise<"deleted" | "delete_failed"> {
  try {
    if (file.exists) file.delete();
    return "deleted";
  } catch {
    return "delete_failed";
  }
}

export async function lookupCachedApk(input: {
  versionCode: number;
  sha256: string;
  expectedSizeBytes?: number | null;
}): Promise<CacheLookupResult> {
  const expectedSha = normalizeSha256Hex(input.sha256);
  if (!expectedSha) return { state: "CACHE_MISS" };

  let cached: ApkDownloadCacheEntry | null;
  try {
    cached = await loadApkDownloadCache();
  } catch {
    return { state: "CACHE_INVALID", reason: "CACHE_IO" };
  }

  if (!cached || cached.versionCode !== input.versionCode) {
    return { state: "CACHE_MISS" };
  }

  const file = new File(cached.fileUri);
  if (!file.exists) {
    await clearApkDownloadCache();
    return { state: "CACHE_MISS" };
  }

  const size = file.size ?? 0;
  if (size <= 0) {
    const deleted = await deleteApkFile(file);
    await clearApkDownloadCache();
    return {
      state: deleted === "deleted" ? "CACHE_INVALID" : "CACHE_DELETE_FAILED",
      reason: "CACHE_CORRUPTED",
    };
  }

  if (input.expectedSizeBytes != null && input.expectedSizeBytes > 0 && size !== input.expectedSizeBytes) {
    const deleted = await deleteApkFile(file);
    await clearApkDownloadCache();
    return {
      state: deleted === "deleted" ? "CACHE_INVALID" : "CACHE_DELETE_FAILED",
      reason: "CACHE_CORRUPTED",
    };
  }

  return { state: "CACHE_FOUND", file };
}

export async function verifyCachedApk(input: {
  file: File;
  sha256: string;
  expectedSizeBytes?: number | null;
}): Promise<{ ok: true } | { ok: false; reason: UpdateErrorClass }> {
  const expectedSha = normalizeSha256Hex(input.sha256);
  if (!expectedSha) return { ok: false, reason: "CACHE_CORRUPTED" };

  const size = input.file.size ?? 0;
  if (size <= 0) return { ok: false, reason: "CACHE_CORRUPTED" };
  if (input.expectedSizeBytes != null && input.expectedSizeBytes > 0 && size !== input.expectedSizeBytes) {
    return { ok: false, reason: "CACHE_CORRUPTED" };
  }

  try {
    const actualSha = normalizeSha256Hex(await sha256HexFromFile(input.file));
    if (!actualSha || !sha256Matches(actualSha, expectedSha)) {
      return { ok: false, reason: "CACHE_CORRUPTED" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "VERIFY_IO" };
  }
}

export async function findVerifiedCachedApk(input: {
  versionCode: number;
  sha256: string;
  expectedSizeBytes?: number | null;
}): Promise<File | null> {
  const lookup = await lookupCachedApk(input);
  if (lookup.state === "CACHE_MISS") return null;
  if (lookup.state === "CACHE_INVALID" || lookup.state === "CACHE_DELETE_FAILED") return null;

  const verify = await verifyCachedApk({
    file: lookup.file,
    sha256: input.sha256,
    expectedSizeBytes: input.expectedSizeBytes,
  });
  if (!verify.ok) {
    const deleted = await deleteApkFile(lookup.file);
    await clearApkDownloadCache();
    return deleted === "deleted" ? null : null;
  }
  return lookup.file;
}
