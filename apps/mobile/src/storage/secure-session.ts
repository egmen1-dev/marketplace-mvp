import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REFRESH_KEY = "lot_refresh_token";
const ACCESS_KEY = "lot_access_token";
const SESSION_META_KEY = "lot_session_meta";

export type StoredSessionMeta = {
  userId: string;
  role: string;
  sessionId: string;
  email?: string;
};

export async function saveTokens(input: {
  accessToken: string;
  refreshToken: string;
  meta: StoredSessionMeta;
}): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, input.refreshToken);
  await SecureStore.setItemAsync(ACCESS_KEY, input.accessToken);
  await SecureStore.setItemAsync(SESSION_META_KEY, JSON.stringify(input.meta));
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getSessionMeta(): Promise<StoredSessionMeta | null> {
  const raw = await SecureStore.getItemAsync(SESSION_META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSessionMeta;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(SESSION_META_KEY);
}

export function getDeviceId(): string {
  return `lot-${Platform.OS}-${Platform.Version}`;
}
