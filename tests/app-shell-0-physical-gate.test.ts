import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("APP-SHELL-0 physical acceptance gate", () => {
  it("documents physical acceptance report", () => {
    const doc = join(process.cwd(), "docs/mobile/APP_SHELL_0_PHYSICAL_ACCEPTANCE.md");
    expect(existsSync(doc)).toBe(true);
    const text = readFileSync(doc, "utf8");
    expect(text).toContain("NOT RUN");
    expect(text).toContain("91adc382");
  });

  it("manifest records physical device gate", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "mobile-release-manifest.json"), "utf8"));
    expect(manifest.physicalDeviceTested).toBe(false);
    expect(manifest.verdict).toBe("PHYSICAL_ACCEPTANCE_NOT_RUN");
  });

  it("has adb acceptance runner script", () => {
    expect(existsSync(join(process.cwd(), "scripts/mobile-physical-acceptance-adb.sh"))).toBe(true);
  });
});
