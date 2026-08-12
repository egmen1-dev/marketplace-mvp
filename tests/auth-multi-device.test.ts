import { describe, expect, it } from "vitest";

import { normalizeAuthEmail } from "@/features/auth/lib/find-user-by-email";

describe("normalizeAuthEmail", () => {
  it("lowercases and trims email", () => {
    expect(normalizeAuthEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});

describe("auth cookie policy", () => {
  it("documents JWT session strategy for multi-device", async () => {
    const { authConfig } = await import("@/auth.config");
    expect(authConfig.session?.strategy).toBe("jwt");
    expect(authConfig.trustHost).toBe(true);
    expect(typeof authConfig.useSecureCookies).toBe("boolean");
  });
});
