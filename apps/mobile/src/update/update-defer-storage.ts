import * as SecureStore from "expo-secure-store";

import type { MobileUpdateInfo } from "./types";
import { UPDATE_DEFER_COOLDOWN_MS } from "./types";

const KEY = "lot_update_defer_v1";

type DeferRecord = {
  versionCode: number;
  deferredAt: number;
};

export async function loadUpdateDefer(): Promise<DeferRecord | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DeferRecord;
    if (typeof parsed.versionCode === "number" && typeof parsed.deferredAt === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function saveUpdateDefer(versionCode: number): Promise<void> {
  const record: DeferRecord = { versionCode, deferredAt: Date.now() };
  await SecureStore.setItemAsync(KEY, JSON.stringify(record));
}

export async function clearUpdateDefer(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function shouldShowUpdatePrompt(info: MobileUpdateInfo): Promise<boolean> {
  if (info.updateState === "UNSUPPORTED_CLIENT" || info.updateState === "REQUIRED_UPDATE") {
    return true;
  }
  if (info.updateState === "NO_UPDATE") return false;

  const defer = await loadUpdateDefer();
  if (!defer || defer.versionCode !== info.versionCode) return true;
  return Date.now() - defer.deferredAt >= UPDATE_DEFER_COOLDOWN_MS;
}
