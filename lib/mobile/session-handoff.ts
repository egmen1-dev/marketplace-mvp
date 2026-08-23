import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const HANDOFF_TTL_SEC = 300;

export type SessionHandoffClaims = {
  sub: string;
  typ: "session_handoff";
  jti: string;
  dest: string;
};

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET missing");
  return new TextEncoder().encode(secret);
}

const usedHandoffTokens = new Set<string>();

export async function issueSessionHandoffToken(userId: string, dest: string): Promise<string> {
  const jti = randomBytes(16).toString("base64url");
  return new SignJWT({
    typ: "session_handoff",
    jti,
    dest,
  } satisfies Omit<SessionHandoffClaims, "sub">)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${HANDOFF_TTL_SEC}s`)
    .sign(authSecret());
}

export async function verifySessionHandoffToken(token: string): Promise<SessionHandoffClaims | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (payload.typ !== "session_handoff" || typeof payload.sub !== "string") return null;
    const jti = String(payload.jti ?? "");
    const dest = String(payload.dest ?? "");
    if (!jti || !dest || usedHandoffTokens.has(jti)) return null;
    usedHandoffTokens.add(jti);
    if (usedHandoffTokens.size > 5000) usedHandoffTokens.clear();
    return { sub: payload.sub, typ: "session_handoff", jti, dest };
  } catch {
    return null;
  }
}

export function hashHandoffForLog(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}
