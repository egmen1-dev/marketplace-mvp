import { clearSession, getAccessToken, getSessionMeta, type StoredSessionMeta } from "../storage/secure-session";
import { decodeJwtPayload } from "../../../../lib/mobile/boot/jwt";

export type SessionRestoreResult = {
  token: string | null;
  meta: StoredSessionMeta | null;
  cleared: boolean;
  issue?: string;
};

export { decodeJwtPayload } from "../../../../lib/mobile/boot/jwt";

export async function restoreSession(): Promise<SessionRestoreResult> {
  let token: string | null = null;
  let meta: StoredSessionMeta | null = null;

  try {
    [token, meta] = await Promise.all([getAccessToken(), getSessionMeta()]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "SecureStore read failed";
    return {
      token: null,
      meta: null,
      cleared: false,
      issue: message.includes("SecureStore") ? "SecureStore read failed" : message,
    };
  }

  if (!token && !meta) {
    return { token: null, meta: null, cleared: false };
  }

  if (token && !meta) {
    await clearSession();
    return { token: null, meta: null, cleared: true, issue: "Session meta missing" };
  }

  if (token) {
    const payload = decodeJwtPayload(token);
    if (!payload) {
      await clearSession();
      return { token: null, meta: null, cleared: true, issue: "JWT decode failed" };
    }
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      await clearSession();
      return { token: null, meta: null, cleared: true, issue: "Session expired" };
    }
  }

  return { token, meta, cleared: false };
}
