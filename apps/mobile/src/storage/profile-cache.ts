import * as SecureStore from "expo-secure-store";

import type { ProfileSnapshot } from "../features/profile/types";

const KEY = "lot_profile_snapshot_v1";

export async function cacheProfileSnapshot(snapshot: ProfileSnapshot): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(snapshot));
}

export async function loadCachedProfileSnapshot(): Promise<ProfileSnapshot | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfileSnapshot;
  } catch {
    return null;
  }
}
