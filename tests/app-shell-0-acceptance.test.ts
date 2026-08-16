import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("APP-SHELL-0 acceptance gates", () => {
  const mobileRoot = join(process.cwd(), "apps/mobile");
  const docsRoot = join(process.cwd(), "docs/mobile");

  it("has native mobile project scaffold", () => {
    expect(existsSync(join(mobileRoot, "app/_layout.tsx"))).toBe(true);
    expect(existsSync(join(mobileRoot, "src/api/client.ts"))).toBe(true);
    expect(existsSync(join(mobileRoot, "app.json"))).toBe(true);
  });

  it("records tech decision for Expo/React Native", () => {
    const doc = readFileSync(join(docsRoot, "APP_SHELL_TECH_DECISION.md"), "utf8");
    expect(doc).toContain("React Native + Expo");
    expect(doc).toContain("ru.lot.marketplace.alpha");
  });

  it("uses secure session storage module", () => {
    const src = readFileSync(join(mobileRoot, "src/storage/secure-session.ts"), "utf8");
    expect(src).toContain("expo-secure-store");
    expect(src).not.toContain("AsyncStorage");
  });

  it("implements refresh replay safety in API client", () => {
    const src = readFileSync(join(mobileRoot, "src/api/client.ts"), "utf8");
    expect(src).toContain("REFRESH_REVOKED");
    expect(src).toContain("clearSession");
  });

  it("has mobile release manifest", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "mobile-release-manifest.json"), "utf8"));
    expect(manifest.releaseChannel).toBe("alpha");
    expect(manifest.packageId).toBe("ru.lot.marketplace.alpha");
  });

  it("mobile bearer auth bridge exists for cart", () => {
    const src = readFileSync(join(process.cwd(), "app/api/cart/route.ts"), "utf8");
    expect(src).toContain("resolveRequestUser");
  });
});
