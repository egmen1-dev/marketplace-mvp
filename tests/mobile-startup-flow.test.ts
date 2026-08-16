import { describe, expect, it, beforeEach, vi } from "vitest";

import { buildMobileBootstrapPayload } from "@/lib/mobile/bootstrap";
import { buildMobileClientConfig } from "@/lib/mobile/client-config";
import { buildMobileNavigationManifest } from "@/lib/mobile/navigation";
import { resolveMobileDeepLink } from "@/lib/mobile/deep-links";
import { resetMemoryMobileSessionStore } from "@/lib/mobile/auth/session-store";
import { mobileAuthLogin, mobileAuthRefresh, mobileAuthLogout } from "@/lib/mobile/auth/service";
import { verifyAccessToken } from "@/lib/mobile/auth/tokens";

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

describe("mobile startup flow", () => {
  beforeEach(() => {
    process.env.CCOS_ENABLED = "true";
    process.env.MOBILE_AUTH_STORE = "memory";
    process.env.AUTH_SECRET = "test-secret-for-mobile-auth-32chars!";
    resetMemoryMobileSessionStore();
  });

  it("runs bootstrap → config → login → navigation → refresh → logout", async () => {
    const bootstrap = buildMobileBootstrapPayload();
    const config = buildMobileClientConfig();
    expect(bootstrap.apiVersion).toBeTruthy();
    expect(config.apiVersion).toBeTruthy();

    const pending = "lot://product/prod-1";
    const tokens = await mobileAuthLogin({
      email: "mobile@test.com",
      password: "secret",
      deviceId: "startup-test",
    });
    const nav = buildMobileNavigationManifest({ authenticated: true, role: "BUYER" });
    expect(nav.items.length).toBeGreaterThan(2);

    const destination = resolveMobileDeepLink(pending);
    expect(destination?.webPath).toContain("prod-1");

    const refreshed = await mobileAuthRefresh(tokens.refreshToken);
    const claims = await verifyAccessToken(refreshed.accessToken);
    expect(claims?.sub).toBe("user-1");

    await mobileAuthLogout(refreshed.refreshToken);
  });
});
