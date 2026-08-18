import { describe, expect, it } from "vitest";

import { runPrivacyAudit } from "@/lib/product-operations/beta/privacy-audit";
import { mapFeedbackCategory } from "@/lib/product-operations/feedback";

describe("EPIC-103 Closed Beta RC Validation", () => {
  it("privacy audit passes on beta observability modules", () => {
    const report = runPrivacyAudit();
    expect(report.verdict).toBe("PASS");
    expect(report.scannedFiles).toBeGreaterThan(5);
    expect(report.findings.filter((f) => f.severity === "blocker")).toHaveLength(0);
  });

  it("feedback categories map correctly", () => {
    expect(mapFeedbackCategory("bug_report")).toBe("error");
    expect(mapFeedbackCategory("seller_issue")).toBe("error");
    expect(mapFeedbackCategory("confusing_ui")).toBe("ux");
  });

  it("documents required forbidden telemetry fields", () => {
    const report = runPrivacyAudit();
    expect(report.forbiddenFieldsChecked).toContain("password");
    expect(report.forbiddenFieldsChecked).toContain("auth_token");
    expect(report.allowedBehaviorFields).toContain("navigationPath");
    expect(report.allowedBehaviorFields).toContain("durationMs");
  });
});
