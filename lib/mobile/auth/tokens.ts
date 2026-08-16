import { createHash, randomBytes } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

export const MOBILE_ACCESS_TOKEN_TTL_SEC = 900;
export const MOBILE_REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type MobileAccessClaims = {
  sub: string;
  sid: string;
  role: string;
  typ: "mobile_access";
};

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET missing");
  return new TextEncoder().encode(secret);
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function issueAccessToken(input: {
  userId: string;
  sessionId: string;
  role: string;
}): Promise<string> {
  return new SignJWT({
    sid: input.sessionId,
    role: input.role,
    typ: "mobile_access",
  } satisfies Omit<MobileAccessClaims, "sub">)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${MOBILE_ACCESS_TOKEN_TTL_SEC}s`)
    .sign(authSecret());
}

export async function verifyAccessToken(token: string): Promise<MobileAccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (payload.typ !== "mobile_access" || typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      sid: String(payload.sid ?? ""),
      role: String(payload.role ?? "BUYER"),
      typ: "mobile_access",
    };
  } catch {
    return null;
  }
}

export function hashDeviceId(deviceId?: string | null): string | null {
  if (!deviceId?.trim()) return null;
  return createHash("sha256").update(deviceId.trim()).digest("hex").slice(0, 32);
}
