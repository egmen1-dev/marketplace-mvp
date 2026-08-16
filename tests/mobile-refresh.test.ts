import { describe, expect, it, beforeEach, vi } from "vitest";

import { resetMemoryMobileSessionStore } from "@/lib/mobile/auth/session-store";
import { mobileAuthLogin, mobileAuthRefresh, mobileAuthLogout } from "@/lib/mobile/auth/service";
import { verifyAccessToken } from "@/lib/mobile/auth/tokens";

vi.mock("@/features/auth/lib/find-user-by-email", () => ({
  findUserByEmailForAuth: vi.fn(async (email: string) =>
    email === "mobile@test.com"
      ? {
          id: "user-1",
          email,
          passwordHash: "hash",
          role: "BUYER",
          isBlocked: false,
          sellerProfile: null,
        }
      : null,
  ),
}));

vi.mock("@/features/auth/lib/password", () => ({
  verifyPassword: vi.fn(async (_password: string, _hash: string) => true),
}));

describe("mobile refresh tokens", () => {
  beforeEach(() => {
    process.env.MOBILE_AUTH_STORE = "memory";
    process.env.AUTH_SECRET = "test-secret-for-mobile-auth-32chars!";
    resetMemoryMobileSessionStore();
  });

  it("issues access and refresh tokens on login", async () => {
    const tokens = await mobileAuthLogin({
      email: "mobile@test.com",
      password: "secret",
      deviceId: "iphone-1",
    });
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.expiresIn).toBe(900);

    const claims = await verifyAccessToken(tokens.accessToken);
    expect(claims?.sub).toBe("user-1");
  });

  it("rotates refresh token on refresh", async () => {
    const first = await mobileAuthLogin({ email: "mobile@test.com", password: "secret" });
    const second = await mobileAuthRefresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.accessToken).toBeTruthy();
  });
});

describe("mobile logout", () => {
  beforeEach(() => {
    process.env.MOBILE_AUTH_STORE = "memory";
    process.env.AUTH_SECRET = "test-secret-for-mobile-auth-32chars!";
    resetMemoryMobileSessionStore();
  });

  it("revokes refresh session on logout", async () => {
    const tokens = await mobileAuthLogin({ email: "mobile@test.com", password: "secret" });
    const result = await mobileAuthLogout(tokens.refreshToken);
    expect(result.revoked).toBe(true);
    await expect(mobileAuthRefresh(tokens.refreshToken)).rejects.toMatchObject({ code: "REFRESH_INVALID" });
  });
});
