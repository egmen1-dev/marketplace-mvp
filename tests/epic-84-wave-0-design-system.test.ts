import { describe, expect, it } from "vitest";

import {
  computeMarketplaceFeeling,
  computeMarketplaceScore,
  classifyIssuePriority,
} from "@/lib/product-operations/marketplace-quality/criteria";
import { detectCrudInSource, screenFailsCrudCheck } from "@/lib/product-operations/marketplace-quality/crud-detection";
import {
  buildMarketplaceQualityReport,
  enrichAuditFile,
  loadMarketplaceQualityAudit,
} from "@/lib/product-operations/marketplace-quality/report";
import { MARKETPLACE_SCREENS } from "@/lib/product-operations/marketplace-quality/screens";

describe("EPIC 84 Wave 0 design system", () => {
  it("exports DESIGN_SYSTEM_VERSION from mobile design-system", async () => {
    const ds = await import("@/apps/mobile/src/design-system/index.ts");
    expect(ds.DESIGN_SYSTEM_VERSION).toBe("1.0.0");
    expect(ds.typography.h3).toBeDefined();
    expect(ds.SPACING_SCALE).toContain(48);
  });

  it("theme tokens re-export design-system", async () => {
    const tokens = await import("@/apps/mobile/src/theme/tokens.ts");
    expect(tokens.colors.orange).toBe(tokens.brand.primary);
  });

  it("computes marketplace score from criteria", () => {
    const score = computeMarketplaceScore({
      visualQuality: 9,
      marketplaceFeel: 9.6,
      premiumFeel: 9,
      conversion: 9.4,
      trust: 9.1,
      accessibility: 8,
      consistency: 8.5,
      motion: 7,
      loadingExperience: 8,
      errorExperience: 8.5,
    });
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(8.5);
  });

  it("computes marketplace feeling subset", () => {
    const feeling = computeMarketplaceFeeling({
      marketplaceFeel: 9.6,
      premiumFeel: 9,
      trust: 9.1,
      visualQuality: 9.2,
    });
    expect(feeling).toBeGreaterThan(9);
  });

  it("classifies issue priorities", () => {
    expect(classifyIssuePriority({ breaksFlow: true })).toBe("P0");
    expect(classifyIssuePriority({ uxRegression: true })).toBe("P1");
    expect(classifyIssuePriority({ visualOnly: true })).toBe("P2");
  });

  it("loads audit with full screen inventory", () => {
    const audit = loadMarketplaceQualityAudit();
    expect(audit.screens.length).toBe(MARKETPLACE_SCREENS.length);
  });

  it("builds marketplace quality report with index", () => {
    const audit = enrichAuditFile(loadMarketplaceQualityAudit());
    const report = buildMarketplaceQualityReport(audit);
    expect(report.epic).toBe("EPIC-84");
    expect(report.screens.length).toBe(25);
    expect(report.marketplaceQualityIndex).not.toBeNull();
  });

  it("flags CRUD patterns in forbidden strings", () => {
    const result = detectCrudInSource("apps/mobile/src/design-system/feedback/States.tsx");
    expect(result.signals.every((s) => s.pattern !== "no_data_ru")).toBe(true);
  });

  it("documents marketplace quality API", async () => {
    const route = await import("@/app/api/admin/product-ops/marketplace-quality/route");
    expect(typeof route.GET).toBe("function");
  });
});

describe("EPIC 84 login screen CRUD check", () => {
  it("login screen passes CRUD gate", () => {
    expect(screenFailsCrudCheck(["apps/mobile/app/login.tsx"])).toBe(false);
  });
});
