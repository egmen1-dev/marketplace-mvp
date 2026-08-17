import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("P0 startup crash guard", () => {
  it("uses lazy expo-router import mode in app.config.js", () => {
    const source = readFileSync(join(process.cwd(), "apps/mobile/app.config.js"), "utf8");
    expect(source).toContain("EXPO_ROUTER_IMPORT_MODE");
    expect(source).toContain("lazy");
  });

  it("disables New Architecture for release stability", () => {
    const source = readFileSync(join(process.cwd(), "apps/mobile/app.config.js"), "utf8");
    expect(source).toContain("newArchEnabled: false");
  });

  it("generates build-info before bundle", () => {
    execSync("npm run mobile:write-build-info", { stdio: "pipe" });
    const path = join(process.cwd(), "apps/mobile/src/config/build-info.generated.ts");
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, "utf8");
    expect(source).toContain("MOBILE_BUILD_INFO");
    expect(source).not.toContain('"commit": "unknown"');
  });

  it("custom entry does not re-throw router failures", () => {
    const source = readFileSync(join(process.cwd(), "apps/mobile/index.js"), "utf8");
    expect(source).toContain("registerFatalBootstrap");
    expect(source).not.toMatch(/throw error/);
  });

  it("OrderCard uses Animated.View for press scale", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/mobile/src/design-system/components/OrderCard.tsx"),
      "utf8",
    );
    expect(source).toContain("Animated.View");
    expect(source).toContain("transform: [{ scale }]");
    expect(source).not.toContain("Pressable\n      style={[styles.card, { transform:");
  });
});
