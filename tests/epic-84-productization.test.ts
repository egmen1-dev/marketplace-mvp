import { describe, expect, it } from "vitest";

import {
  computeProductReleaseVerdict,
  type ProductReleaseMetrics,
} from "@/lib/product-operations/release/verdict";
import { JOURNEY_SCREENS, SELLER_JOURNEY_SCREENS } from "@/lib/product-operations/types";

function baseMetrics(overrides: Partial<ProductReleaseMetrics> = {}): ProductReleaseMetrics {
  return {
    adoptionPercent: 80,
    dau: 5,
    retention7d: 20,
    crashFreeRate: 99.5,
    updateRatePercent: 50,
    buyerFunnelHealthy: true,
    sellerFunnelHealthy: true,
    buyerFunnel: JOURNEY_SCREENS.map((screen) => ({ screen, count: 10, dropOffRate: 5 })),
    sellerFunnel: SELLER_JOURNEY_SCREENS.map((screen) => ({ screen, count: 8, dropOffRate: 5 })),
    latestVersionName: "0.1.2-alpha",
    latestVersionCode: 3,
    ...overrides,
  };
}

describe("EPIC 84 product release verdict", () => {
  it("returns NO-GO when P0 > 0", () => {
    const result = computeProductReleaseVerdict(baseMetrics(), { p0Count: 1, physicalPass: true });
    expect(result.verdict).toBe("NO-GO");
    expect(result.gates.p0Clear).toBe(false);
  });

  it("returns NO-GO when crash-free below 90%", () => {
    const result = computeProductReleaseVerdict(baseMetrics({ crashFreeRate: 85 }), { physicalPass: true });
    expect(result.verdict).toBe("NO-GO");
  });

  it("returns GO when all gates pass including physical", () => {
    const result = computeProductReleaseVerdict(baseMetrics(), { physicalPass: true, p0Count: 0 });
    expect(result.verdict).toBe("GO");
    expect(result.gates.crashFreeAbove99).toBe(true);
    expect(result.gates.buyerFlowPass).toBe(true);
    expect(result.gates.sellerFlowPass).toBe(true);
  });

  it("returns WATCH when physical pass pending", () => {
    const result = computeProductReleaseVerdict(baseMetrics(), { physicalPass: false, p0Count: 0 });
    expect(result.verdict).toBe("WATCH");
    expect(result.reasons.some((r) => r.includes("physical"))).toBe(true);
  });

  it("documents release verdict API route", async () => {
    const route = await import("@/app/api/admin/product-ops/release-verdict/route");
    expect(typeof route.GET).toBe("function");
  });

  it("documents epic 84 productization docs", () => {
    const fs = require("node:fs");
    expect(fs.existsSync("docs/product/EPIC_84_MARKETPLACE_PRODUCTIZATION.md")).toBe(true);
    expect(fs.existsSync("docs/product/EPIC_84_WAVE_0_UX_AUDIT.md")).toBe(true);
  });
});
