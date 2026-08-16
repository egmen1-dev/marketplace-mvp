import { describe, expect, it } from "vitest";

import { buildMobileAuthDecisionReport } from "@/lib/mobile/auth-decision";

describe("mobile auth decision", () => {
  it("selects Decision A — existing JWT for native app", () => {
    const report = buildMobileAuthDecisionReport();
    expect(report.decision).toBe("A");
    expect(report.jwtSessionStrategy).toBe(true);
    expect(report.webSessionUnchanged).toBe(true);
  });

  it("documents refresh as explicit blocker", () => {
    const report = buildMobileAuthDecisionReport();
    expect(report.refreshImplemented).toBe(false);
    expect(report.blockers).toContain("mobile_refresh_not_implemented");
    expect(report.nativeAppReady).toBe("PARTIAL");
  });

  it("documents auth decision file", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const doc = readFileSync(resolve(process.cwd(), "docs/MOBILE_AUTH_DECISION.md"), "utf8");
    expect(doc).toMatch(/Decision A/);
  });
});
