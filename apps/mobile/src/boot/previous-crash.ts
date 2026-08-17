import * as SecureStore from "expo-secure-store";

const PREVIOUS_CRASH_KEY = "lot_previous_crash_v1";

export type PreviousCrashRecord = {
  crashId: string;
  stage: string;
  message: string;
  recordedAt: string;
  versionName: string;
  versionCode: number;
  gitSha: string;
};

export async function persistPreviousCrash(record: PreviousCrashRecord): Promise<void> {
  try {
    await SecureStore.setItemAsync(PREVIOUS_CRASH_KEY, JSON.stringify(record));
  } catch {
    // Best-effort — never block startup
  }
}

export async function loadPreviousCrash(): Promise<PreviousCrashRecord | null> {
  try {
    const raw = await SecureStore.getItemAsync(PREVIOUS_CRASH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PreviousCrashRecord;
  } catch {
    return null;
  }
}

export async function clearPreviousCrash(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PREVIOUS_CRASH_KEY);
  } catch {
    // ignore
  }
}
