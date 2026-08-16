import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("MOBILE-RELEASE-GATE-003 artifacts", () => {
  it("documents gate verdict", () => {
    const doc = readFileSync(join(process.cwd(), "docs/mobile/MOBILE_RELEASE_GATE_003.md"), "utf8");
    expect(doc).toContain("MOBILE STAGING BACKEND:     READY");
    expect(doc).toContain("MOB-PA-002");
  });

  it("manifest records staging ready and MOB-PA-002 closed", () => {
    const m = JSON.parse(readFileSync(join(process.cwd(), "mobile-release-manifest.json"), "utf8"));
    expect(m.stagingDeployStatus).toBe("READY");
    expect(m.mobPa002).toBe("CLOSED");
    expect(m.closedAlphaVerdict).toBe("NO-GO");
  });

  it("has staging gate script", () => {
    expect(existsSync(join(process.cwd(), "scripts/mobile-release-gate-003-staging.ts"))).toBe(true);
  });
});
