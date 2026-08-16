import { describe, expect, it, beforeEach, vi } from "vitest";

import { resetMemoryMobileSessionStore } from "@/lib/mobile/auth/session-store";
import { mobileAuthLogin, mobileAuthRefresh, MobileAuthError } from "@/lib/mobile/auth/service";

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

describe("mobile refresh replay protection", () => {
  beforeEach(() => {
    process.env.MOBILE_AUTH_STORE = "memory";
    process.env.AUTH_SECRET = "test-secret-for-mobile-auth-32chars!";
    resetMemoryMobileSessionStore();
  });

  it("rejects replay of rotated refresh token", async () => {
    const first = await mobileAuthLogin({ email: "mobile@test.com", password: "secret" });
    const oldRefresh = first.refreshToken;
    await mobileAuthRefresh(oldRefresh);

    await expect(mobileAuthRefresh(oldRefresh)).rejects.toBeInstanceOf(MobileAuthError);
    await expect(mobileAuthRefresh(oldRefresh)).rejects.toMatchObject({ code: "REFRESH_REPLAY" });
  });
});
