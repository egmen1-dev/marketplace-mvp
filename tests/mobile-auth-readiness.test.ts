import { describe, expect, it } from "vitest";

describe("mobile auth readiness", () => {
  it("documents JWT session strategy suitable for mobile foundation", async () => {
    const { authConfig } = await import("@/auth.config");
    expect(authConfig.session?.strategy).toBe("jwt");
    expect(authConfig.trustHost).toBe(true);
  });

  it("reserves mobile session endpoints without breaking web auth", async () => {
    const sessionMod = await import("@/app/api/mobile/auth/session/route");
    expect(typeof sessionMod.POST).toBe("function");

    const refreshMod = await import("@/app/api/mobile/auth/refresh/route");
    expect(typeof refreshMod.POST).toBe("function");

    const logoutMod = await import("@/app/api/mobile/auth/logout/route");
    expect(typeof logoutMod.POST).toBe("function");
  });

  it("documents mobile auth architecture file", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const doc = readFileSync(resolve(process.cwd(), "docs/MOBILE_AUTH_ARCHITECTURE.md"), "utf8");
    expect(doc).toMatch(/JWT/);
    expect(doc).toMatch(/backward-compatible/);
  });
});
