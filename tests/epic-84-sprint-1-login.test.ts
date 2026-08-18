import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { detectCrudInSource } from "@/lib/product-operations/marketplace-quality/crud-detection";
import { enrichAuditFile, loadMarketplaceQualityAudit } from "@/lib/product-operations/marketplace-quality/report";
import { computeMarketplaceFeeling, computeMarketplaceScore } from "@/lib/product-operations/marketplace-quality/criteria";

describe("EPIC 84 Sprint 1 — Login Experience", () => {
  it("login screen uses LoginExperience full redesign", () => {
    const source = readFileSync("apps/mobile/app/login.tsx", "utf8");
    expect(source).toContain("LoginExperience");
    expect(source).not.toContain("Alert.alert");
    expect(source).not.toContain("PrimaryButton");
  });

  it("login files pass CRUD detection", () => {
    for (const file of ["apps/mobile/app/login.tsx", "apps/mobile/src/features/auth/LoginExperience.tsx"]) {
      expect(detectCrudInSource(file).fail).toBe(false);
    }
  });

  it("meets sprint gate marketplace scores", () => {
    const audit = enrichAuditFile(loadMarketplaceQualityAudit());
    const login = audit.screens.find((s) => s.screenId === "login");
    expect(login?.scoresAfter).toBeTruthy();
    const score = computeMarketplaceScore(login!.scoresAfter!);
    const feeling = computeMarketplaceFeeling(login!.scoresAfter!);
    expect(score!).toBeGreaterThanOrEqual(9.0);
    expect(feeling!).toBeGreaterThanOrEqual(9.5);
    expect(score! - (login!.marketplaceScoreBefore ?? 0)).toBeGreaterThanOrEqual(2.0);
  });

  it("documents sprint gate script on disk", () => {
    const fs = require("node:fs");
    expect(fs.existsSync("scripts/epic-84-sprint-1-login-gate.ts")).toBe(true);
    expect(fs.existsSync("docs/product/EPIC_84_SPRINT_1_LOGIN.md")).toBe(true);
  });
});
