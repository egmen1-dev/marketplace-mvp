import type { UserRole } from "@prisma/client";

import { findUserByEmailForAuth } from "@/features/auth/lib/find-user-by-email";
import { verifyPassword } from "@/features/auth/lib/password";

import {
  MOBILE_ACCESS_TOKEN_TTL_SEC,
  MOBILE_REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashDeviceId,
  hashRefreshToken,
  issueAccessToken,
} from "./tokens";
import { memoryMobileSessionStore } from "./session-store";
import { prismaMobileSessionStore } from "./prisma-store";
import type { MobileSessionStore } from "./session-store";

export type MobileAuthTokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
  userId: string;
  role: UserRole;
};

export type MobileAuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "USER_BLOCKED"
  | "REFRESH_INVALID"
  | "REFRESH_EXPIRED"
  | "REFRESH_REVOKED"
  | "REFRESH_REPLAY"
  | "SESSION_NOT_FOUND";

export class MobileAuthError extends Error {
  constructor(
    public code: MobileAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MobileAuthError";
  }
}

function resolveStore(): MobileSessionStore {
  if (process.env.MOBILE_AUTH_STORE === "memory" || process.env.VITEST === "true") {
    return memoryMobileSessionStore;
  }
  return prismaMobileSessionStore;
}

async function buildTokenPair(input: {
  userId: string;
  role: UserRole;
  deviceIdHash: string | null;
}): Promise<MobileAuthTokenPair> {
  const store = resolveStore();
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + MOBILE_REFRESH_TOKEN_TTL_MS);

  const session = await store.createSession({
    userId: input.userId,
    role: input.role,
    deviceIdHash: input.deviceIdHash,
    refreshTokenHash,
    expiresAt,
  });

  const accessToken = await issueAccessToken({
    userId: input.userId,
    sessionId: session.id,
    role: input.role,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: MOBILE_ACCESS_TOKEN_TTL_SEC,
    sessionId: session.id,
    userId: input.userId,
    role: input.role,
  };
}

export async function mobileAuthLogin(input: {
  email: string;
  password: string;
  deviceId?: string;
}): Promise<MobileAuthTokenPair> {
  const user = await findUserByEmailForAuth(input.email);
  if (!user?.passwordHash) {
    throw new MobileAuthError("INVALID_CREDENTIALS", "Invalid credentials");
  }
  if (user.isBlocked) {
    throw new MobileAuthError("USER_BLOCKED", "User blocked");
  }
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new MobileAuthError("INVALID_CREDENTIALS", "Invalid credentials");
  }

  return buildTokenPair({
    userId: user.id,
    role: user.role,
    deviceIdHash: hashDeviceId(input.deviceId),
  });
}

export async function mobileAuthRefresh(refreshToken: string): Promise<MobileAuthTokenPair> {
  const store = resolveStore();
  const hash = hashRefreshToken(refreshToken);
  const session = await store.findByRefreshHash(hash);

  if (!session) {
    throw new MobileAuthError("REFRESH_INVALID", "Refresh token invalid");
  }

  if (session.refreshTokenHash !== hash) {
    throw new MobileAuthError("REFRESH_REPLAY", "Refresh token replay detected");
  }

  if (session.revokedAt) {
    throw new MobileAuthError("REFRESH_REVOKED", "Refresh token revoked");
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await store.revokeSession(session.id);
    throw new MobileAuthError("REFRESH_EXPIRED", "Refresh token expired");
  }

  const newRefreshToken = generateRefreshToken();
  const newHash = hashRefreshToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + MOBILE_REFRESH_TOKEN_TTL_MS);

  const rotated = await store.rotateSession({
    sessionId: session.id,
    newRefreshTokenHash: newHash,
    previousRefreshTokenHash: hash,
    expiresAt,
  });

  if (!rotated) {
    throw new MobileAuthError("SESSION_NOT_FOUND", "Session not found");
  }

  const accessToken = await issueAccessToken({
    userId: rotated.userId,
    sessionId: rotated.id,
    role: rotated.role,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: MOBILE_ACCESS_TOKEN_TTL_SEC,
    sessionId: rotated.id,
    userId: rotated.userId,
    role: rotated.role,
  };
}

export async function mobileAuthLogout(refreshToken: string): Promise<{ revoked: boolean }> {
  const store = resolveStore();
  const hash = hashRefreshToken(refreshToken);
  const session = await store.findByRefreshHash(hash);
  if (!session) {
    throw new MobileAuthError("REFRESH_INVALID", "Refresh token invalid");
  }
  const revoked = await store.revokeSession(session.id);
  return { revoked };
}

export async function assertRefreshReplayBlocked(oldRefreshToken: string): Promise<void> {
  try {
    await mobileAuthRefresh(oldRefreshToken);
  } catch (err) {
    if (err instanceof MobileAuthError && (err.code === "REFRESH_REPLAY" || err.code === "REFRESH_INVALID")) {
      return;
    }
    throw err;
  }
  throw new Error("Expected replay rejection");
}

export { resolveStore as getMobileSessionStoreForTests };
