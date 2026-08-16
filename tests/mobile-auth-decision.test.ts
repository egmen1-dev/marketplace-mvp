import { describe, expect, it } from "vitest";

import { buildMobileAuthDecisionReport } from "@/lib/mobile/auth-decision";

describe("mobile auth decision", () => {
  it("selects Decision A — existing JWT for native app", () => {
    const report = buildMobileAuthDecisionReport();
    expect(report.decision).toBe("A");
    expect(report.jwtSessionStrategy).toBe(true);
    expect(report.webSessionUnchanged).toBe(true);
  });

  it("documents refresh implemented for native app", () => {
    const report = buildMobileAuthDecisionReport();
    expect(report.refreshImplemented).toBe(true);
    expect(report.blockers).toHaveLength(0);
    expect(report.nativeAppReady).toBe("YES");
  });

  it("documents auth decision file", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const doc = readFileSync(resolve(process.cwd(), "docs/MOBILE_AUTH_DECISION.md"), "utf8");
    expect(doc).toMatch(/Decision A/);
  });
});
