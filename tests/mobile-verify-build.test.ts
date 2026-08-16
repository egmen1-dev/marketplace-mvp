import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile verify build", () => {
  it("generates build-info with non-unknown commit", () => {
    execSync("node scripts/write-mobile-build-info.mjs", { stdio: "pipe" });
    const path = join(process.cwd(), "apps/mobile/src/config/build-info.generated.ts");
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, "utf8");
    expect(source).toContain("MOBILE_BUILD_INFO");
    expect(source).not.toContain('"commit": "unknown"');
  });

  it("startup error screen exposes build metadata panel", () => {
    const source = readFileSync(join(process.cwd(), "apps/mobile/src/features/startup/StartupErrorScreen.tsx"), "utf8");
    expect(source).toContain("BuildInfoPanel");
  });

  it("splash long-press opens build info route", () => {
    const source = readFileSync(join(process.cwd(), "apps/mobile/app/index.tsx"), "utf8");
    expect(source).toContain('router.push("/build-info")');
  });

  it("mobile:verify-build script exists in package.json", () => {
    const pkg = readFileSync(join(process.cwd(), "package.json"), "utf8");
    expect(pkg).toContain("mobile:verify-build");
  });
});
