import { describe, expect, it, afterEach } from "vitest";

import { auditAdminOperations } from "@/lib/marketplace-foundation-audit/admin-operations";
import { auditBuyerFlow } from "@/lib/marketplace-foundation-audit/buyer-flow";
import { auditPaymentFlow } from "@/lib/marketplace-foundation-audit/payment-flow";
import { auditReviewFlow } from "@/lib/marketplace-foundation-audit/review-flow";
import { isMarketplaceFoundationAuditEnabled } from "@/lib/marketplace-foundation-audit/flags";
import { buildOrderLifecycleHealth } from "@/lib/marketplace-foundation-audit/order-flow";
import {
  assertMarketplaceFoundationAuditAccess,
  MarketplaceFoundationAuditForbiddenError,
} from "@/lib/marketplace-foundation-audit/permissions";
import {
  buildAreaResult,
  computeFoundationScore,
  scoreFromChecks,
} from "@/lib/marketplace-foundation-audit/readiness-score";
import {
  buildCriticalIssues,
  buildFoundationRecommendations,
  buildLaunchChecklist,
} from "@/lib/marketplace-foundation-audit/recommendations";
import { AREA_WEIGHTS } from "@/lib/marketplace-foundation-audit/types";

const PREV_FLAG = process.env.MARKETPLACE_FOUNDATION_AUDIT_ENABLED;

describe("marketplace foundation audit flag", () => {
  afterEach(() => {
    process.env.MARKETPLACE_FOUNDATION_AUDIT_ENABLED = PREV_FLAG;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_FOUNDATION_AUDIT_ENABLED;
    expect(isMarketplaceFoundationAuditEnabled()).toBe(false);
  });
});

describe("scoreFromChecks", () => {
  it("returns 100 when all checks pass", () => {
    expect(
      scoreFromChecks([
        { id: "a", label: "A", passed: true, severity: "info" },
        { id: "b", label: "B", passed: true, severity: "info" },
      ]),
    ).toBe(100);
  });

  it("penalizes critical failures", () => {
    const score = scoreFromChecks([
      { id: "a", label: "A", passed: true, severity: "info" },
      { id: "b", label: "B", passed: false, severity: "critical" },
    ]);
    expect(score).toBeLessThan(100);
  });
});

describe("computeFoundationScore", () => {
  it("computes weighted total", () => {
    const areas = [
      buildAreaResult({
        area: "buyer",
        title: "Buyer",
        checks: auditBuyerFlow(),
        weight: AREA_WEIGHTS.buyer,
      }),
      buildAreaResult({
        area: "review",
        title: "Reviews",
        checks: auditReviewFlow(),
        weight: AREA_WEIGHTS.review,
      }),
    ];
    const score = computeFoundationScore(areas);
    expect(score.total).toBeGreaterThan(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.areas).toHaveLength(2);
  });
});

describe("buildOrderLifecycleHealth", () => {
  it("reports low risk when transitions exist", () => {
    const health = buildOrderLifecycleHealth();
    expect(health.totalTransitions).toBeGreaterThan(20);
    expect(health.risk).toBe("LOW");
    expect(health.missing).toBe(0);
  });
});

describe("buildFoundationRecommendations", () => {
  it("recommends reviews when review checks fail", () => {
    const areas = [
      buildAreaResult({
        area: "review",
        title: "Reviews",
        checks: auditReviewFlow(),
        weight: AREA_WEIGHTS.review,
      }),
    ];
    const recs = buildFoundationRecommendations(areas);
    expect(recs.some((r) => r.id === "rec-reviews")).toBe(true);
  });
});

describe("buildLaunchChecklist", () => {
  it("marks reviews not ready", () => {
    const areas = [
      buildAreaResult({
        area: "review",
        title: "Reviews",
        checks: auditReviewFlow(),
        weight: AREA_WEIGHTS.review,
      }),
    ];
    const checklist = buildLaunchChecklist(areas);
    expect(checklist.find((i) => i.id === "reviews")?.ready).toBe(false);
  });
});

describe("buildCriticalIssues", () => {
  it("collects critical failed checks", () => {
    const areas = [
      buildAreaResult({
        area: "payment",
        title: "Payments",
        checks: auditPaymentFlow(),
        weight: AREA_WEIGHTS.payment,
      }),
    ];
    const issues = buildCriticalIssues(areas);
    expect(Array.isArray(issues)).toBe(true);
  });
});

describe("auditAdminOperations", () => {
  it("includes ops checks for enabled overview", () => {
    const checks = auditAdminOperations({
      enabled: true,
      orders: { newCount: 1, problemCount: 0, overdueCount: 0 },
      sellers: { newCount: 1, activeCount: 2, problemCount: 1 },
      products: { pendingReview: 0, rejected: 0, noSales: 3 },
      finance: { pendingPayments: 0, pendingPayouts: 1, openDisputes: 0 },
      trust: { openReports: 0, riskFlags: 0 },
    });
    expect(checks.some((c) => c.id === "ops-admin-orders")).toBe(true);
  });
});

describe("permissions", () => {
  it("requires admin role", () => {
    expect(() =>
      assertMarketplaceFoundationAuditAccess({ role: "BUYER" }),
    ).toThrow(MarketplaceFoundationAuditForbiddenError);
  });
});
