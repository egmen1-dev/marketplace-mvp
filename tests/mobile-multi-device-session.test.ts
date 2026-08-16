import { describe, expect, it, beforeEach, vi } from "vitest";

import { resetMemoryMobileSessionStore, memoryMobileSessionStore } from "@/lib/mobile/auth/session-store";
import { mobileAuthLogin, mobileAuthLogout } from "@/lib/mobile/auth/service";

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

describe("mobile multi-device sessions", () => {
  beforeEach(() => {
    process.env.MOBILE_AUTH_STORE = "memory";
    process.env.AUTH_SECRET = "test-secret-for-mobile-auth-32chars!";
    resetMemoryMobileSessionStore();
  });

  it("allows independent sessions per device", async () => {
    const ios = await mobileAuthLogin({ email: "mobile@test.com", password: "secret", deviceId: "ios" });
    const android = await mobileAuthLogin({ email: "mobile@test.com", password: "secret", deviceId: "android" });

    expect(ios.sessionId).not.toBe(android.sessionId);
    expect(await memoryMobileSessionStore.countActiveSessions("user-1")).toBe(2);

    await mobileAuthLogout(ios.refreshToken);
    expect(await memoryMobileSessionStore.countActiveSessions("user-1")).toBe(1);
  });
});
