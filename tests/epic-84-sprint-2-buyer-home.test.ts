import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { detectCrudInSource } from "@/lib/product-operations/marketplace-quality/crud-detection";
import { enrichAuditFile, loadMarketplaceQualityAudit } from "@/lib/product-operations/marketplace-quality/report";
import { computeMarketplaceFeeling, computeMarketplaceScore } from "@/lib/product-operations/marketplace-quality/criteria";

describe("EPIC 84 Sprint 2 — Buyer Home", () => {
  it("index uses BuyerHomeExperience module", () => {
    const source = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
    expect(source).toContain("BuyerHomeExperience");
    expect(source).not.toContain("fetchBuyerHome");
  });

  it("experience avoids fake personalization label", () => {
    const source = readFileSync("apps/mobile/src/features/buyer-home/BuyerHomeExperience.tsx", "utf8");
    expect(source).not.toContain("Для вас");
    expect(source).toContain("Рекомендуем посмотреть");
  });

  it("buyer home files pass CRUD detection", () => {
    for (const file of [
      "apps/mobile/app/(tabs)/index.tsx",
      "apps/mobile/src/features/buyer-home/BuyerHomeExperience.tsx",
    ]) {
      expect(detectCrudInSource(file).fail).toBe(false);
    }
  });

  it("meets sprint gate marketplace scores", () => {
    const audit = enrichAuditFile(loadMarketplaceQualityAudit());
    const home = audit.screens.find((s) => s.screenId === "buyer_home");
    expect(home?.scoresAfter).toBeTruthy();
    const score = computeMarketplaceScore(home!.scoresAfter!);
    const feeling = computeMarketplaceFeeling(home!.scoresAfter!);
    expect(score!).toBeGreaterThanOrEqual(9.0);
    expect(feeling!).toBeGreaterThanOrEqual(9.4);
    expect(score! - (home!.marketplaceScoreBefore ?? 0)).toBeGreaterThanOrEqual(2.0);
  });
});
