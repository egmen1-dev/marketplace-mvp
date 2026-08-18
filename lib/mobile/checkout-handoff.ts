import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const CHECKOUT_STRATEGY = "web_redirect" as const;

const HANDOFF_TTL_SEC = 300;

export type CheckoutHandoffClaims = {
  sub: string;
  typ: "checkout_handoff";
  jti: string;
};

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET missing");
  return new TextEncoder().encode(secret);
}

const usedHandoffTokens = new Set<string>();

export async function issueCheckoutHandoffToken(userId: string): Promise<string> {
  const jti = randomBytes(16).toString("base64url");
  return new SignJWT({ typ: "checkout_handoff", jti } satisfies Omit<CheckoutHandoffClaims, "sub">)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${HANDOFF_TTL_SEC}s`)
    .sign(authSecret());
}

export async function verifyCheckoutHandoffToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (payload.typ !== "checkout_handoff" || typeof payload.sub !== "string") return null;
    const jti = String(payload.jti ?? "");
    if (!jti || usedHandoffTokens.has(jti)) return null;
    usedHandoffTokens.add(jti);
    if (usedHandoffTokens.size > 5000) usedHandoffTokens.clear();
    return payload.sub;
  } catch {
    return null;
  }
}

export function hashHandoffForLog(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}
