import { Platform } from "react-native";

import { bootMark } from "../boot/early-boot";
import { secureStoreDelete, secureStoreGet, secureStoreSet } from "./lazy-secure-store";

const REFRESH_KEY = "lot_refresh_token";
const ACCESS_KEY = "lot_access_token";
const SESSION_META_KEY = "lot_session_meta";

export type StoredSessionMeta = {
  userId: string;
  role: string;
  sessionId: string;
};

export async function saveTokens(input: {
  accessToken: string;
  refreshToken: string;
  meta: StoredSessionMeta;
}): Promise<void> {
  await secureStoreSet(REFRESH_KEY, input.refreshToken);
  await secureStoreSet(ACCESS_KEY, input.accessToken);
  await secureStoreSet(SESSION_META_KEY, JSON.stringify(input.meta));
}

export async function getRefreshToken(): Promise<string | null> {
  return secureStoreGet(REFRESH_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return secureStoreGet(ACCESS_KEY);
}

export async function getSessionMeta(): Promise<StoredSessionMeta | null> {
  const raw = await secureStoreGet(SESSION_META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSessionMeta;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await secureStoreDelete(REFRESH_KEY);
  await secureStoreDelete(ACCESS_KEY);
  await secureStoreDelete(SESSION_META_KEY);
}

export function getDeviceId(): string {
  return `lot-${Platform.OS}-${Platform.Version}`;
}

bootMark("secure-session module evaluated");
