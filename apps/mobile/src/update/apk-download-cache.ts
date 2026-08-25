import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";

import { normalizeSha256Hex, sha256HexFromFile, sha256Matches } from "./apk-sha256";

const CACHE_KEY = "lot_apk_update_cache_v1";

export type ApkDownloadCacheEntry = {
  versionCode: number;
  versionName: string;
  fileUri: string;
  sha256: string;
  downloadedAt: string;
};

export function apkCacheFile(versionCode: number): File {
  return new File(Paths.cache, `lot-update-${versionCode}.apk`);
}

export async function loadApkDownloadCache(): Promise<ApkDownloadCacheEntry | null> {
  const raw = await SecureStore.getItemAsync(CACHE_KEY);
  if (!raw) return null;
  try {
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

export async function findVerifiedCachedApk(input: {
  versionCode: number;
  sha256: string;
}): Promise<File | null> {
  const expectedSha = normalizeSha256Hex(input.sha256);
  if (!expectedSha) return null;

  const cached = await loadApkDownloadCache();
  if (!cached || cached.versionCode !== input.versionCode) return null;

  const file = new File(cached.fileUri);
  if (!file.exists) {
    await clearApkDownloadCache();
    return null;
  }

  const actualSha = normalizeSha256Hex(await sha256HexFromFile(file));
  if (!actualSha || !sha256Matches(actualSha, expectedSha)) {
    try {
      file.delete();
    } catch {
      // ignore cleanup failures
    }
    await clearApkDownloadCache();
    return null;
  }

  return file;
}
