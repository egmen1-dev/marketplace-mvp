import { describe, expect, it, beforeEach, vi } from "vitest";

import { resetMemoryMobileSessionStore } from "@/lib/mobile/auth/session-store";
import { mobileAuthLogin, mobileAuthLogout, mobileAuthRefresh } from "@/lib/mobile/auth/service";

vi.mock("@/features/auth/lib/find-user-by-email", () => ({
  findUserByEmailForAuth: vi.fn(async () => ({
    id: "user-1",
    email: "mobile@test.com",
    passwordHash: "hash",
    role: "BUYER",
    isBlocked: false,
    sellerProfile: null,
  })),
}));

vi.mock("@/features/auth/lib/password", () => ({
  verifyPassword: vi.fn(async () => true),
}));

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

  it("rejects logout with unknown refresh token", async () => {
    await expect(mobileAuthLogout("not-a-valid-token")).rejects.toMatchObject({ code: "REFRESH_INVALID" });
  });

  it("blocks refresh after logout even after rotation", async () => {
    const first = await mobileAuthLogin({ email: "mobile@test.com", password: "secret" });
    const rotated = await mobileAuthRefresh(first.refreshToken);
    await mobileAuthLogout(rotated.refreshToken);
    await expect(mobileAuthRefresh(rotated.refreshToken)).rejects.toMatchObject({ code: "REFRESH_INVALID" });
    await expect(mobileAuthRefresh(first.refreshToken)).rejects.toMatchObject({ code: "REFRESH_REPLAY" });
  });
});
