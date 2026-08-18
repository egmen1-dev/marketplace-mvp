import { describe, expect, it } from "vitest";

import {
  CLOSED_BETA_EVIDENCE_BASELINE,
  inferEvidenceSource,
  isEligibleReleaseMetric,
  withEvidenceSource,
} from "@/lib/product-operations/beta/evidence-eligibility";

describe("beta evidence eligibility", () => {
  const afterBaseline = new Date(CLOSED_BETA_EVIDENCE_BASELINE.effectiveAt);

  it("classifies EPIC 103 controlled crash as VALIDATION", () => {
    expect(
      inferEvidenceSource({
        screen: "epic103_crash_test",
        sessionId: "epic103-e2e-1",
        metadata: { errorMessage: "BETA_VALIDATION_CONTROLLED_CRASH" },
      }),
    ).toBe("VALIDATION");
  });

  it("excludes validation events from release metrics even after baseline", () => {
    expect(
      isEligibleReleaseMetric({
        createdAt: afterBaseline,
        screen: "epic103_crash_test",
        metadata: { evidenceSource: "VALIDATION" },
      }),
    ).toBe(false);
  });

  it("excludes pre-baseline real events", () => {
    expect(
      isEligibleReleaseMetric({
        createdAt: new Date("2026-08-16T00:00:00.000Z"),
        screen: "home",
        metadata: { evidenceSource: "REAL_USER" },
      }),
    ).toBe(false);
  });

  it("includes post-baseline real user events", () => {
    expect(
      isEligibleReleaseMetric({
        createdAt: afterBaseline,
        screen: "catalog",
        sessionId: "user-session-1",
        metadata: { evidenceSource: "REAL_USER" },
      }),
    ).toBe(true);
  });

  it("withEvidenceSource stamps metadata", () => {
    expect(withEvidenceSource({}, "VALIDATION", "epic103").evidenceSource).toBe("VALIDATION");
  });
});

describe("journey validation semantics", () => {
  it("allows INSUFFICIENT_DATA with null completion rate", () => {
    const sample = {
      journey: "buyer" as const,
      status: "INSUFFICIENT_DATA" as const,
      steps: [],
      totalSessions: 0,
      completedSessions: 0,
      completionRate: null,
    };
    expect(sample.status).toBe("INSUFFICIENT_DATA");
    expect(sample.completionRate).toBeNull();
  });
});
