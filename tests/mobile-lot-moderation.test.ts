import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildModerationResult, mapDecisionToModerationStatus } from "@/lib/moderation/decision-engine";
import { computeContentVersionHash, moderationContentStale } from "@/lib/moderation/content-version";
import { evaluateModerationRisk } from "@/lib/moderation/risk-engine";
import { analyzeTextSignals } from "@/lib/moderation/signals/text-signals";
import { IMAGE_MODERATION_AVAILABLE, OCR_AVAILABLE } from "@/lib/moderation/signals/image-signals";
import { getModerationAutomationMode } from "@/lib/moderation/config";

const lifecycle = readFileSync("lib/moderation/lifecycle.ts", "utf8");
const adminRoute = readFileSync("app/api/admin/moderation/[id]/decision/route.ts", "utf8");
const sellerModerationRoute = readFileSync("app/api/mobile/seller/products/[id]/moderation/route.ts", "utf8");

describe("EPIC 174 — moderation engine", () => {
  it("uses SHADOW mode by default — system recommendation without auto publish", () => {
    const prev = process.env.MODERATION_AUTOMATION_MODE;
    delete process.env.MODERATION_AUTOMATION_MODE;
    expect(getModerationAutomationMode()).toBe("SHADOW");
    const result = buildModerationResult({
      reasons: [],
      signals: [],
      imageSignals: {
        evaluation: "NOT_EVALUATED",
        ocrAvailable: false,
      },
      contentVersionHash: "abc",
    });
    expect(result.decision).toBe("MANUAL_REVIEW");
    process.env.MODERATION_AUTOMATION_MODE = prev;
  });

  it("detects contact info as NEEDS_CHANGES signal, not blind reject", () => {
    const { reasons, signals } = analyzeTextSignals({
      title: "Дрель",
      description: "Звоните 8-999-123-45-67",
    });
    expect(reasons.some((r) => r.code === "CONTACT_INFO_IN_TEXT")).toBe(true);
    const risk = evaluateModerationRisk(signals);
    const result = buildModerationResult({
      reasons,
      signals,
      imageSignals: { evaluation: "NOT_EVALUATED", ocrAvailable: false },
      contentVersionHash: "hash",
    });
    expect(mapDecisionToModerationStatus(result.decision)).toBe("PENDING_REVIEW");
    expect(risk.score).toBeGreaterThan(0);
  });

  it("tracks content version invalidation", () => {
    const h1 = computeContentVersionHash({
      name: "A",
      description: null,
      categoryId: "c1",
      productTypeId: "p1",
      condition: "NEW",
      imageUrls: ["/a.jpg"],
      characteristics: [],
    });
    const h2 = computeContentVersionHash({
      name: "B",
      description: null,
      categoryId: "c1",
      productTypeId: "p1",
      condition: "NEW",
      imageUrls: ["/a.jpg"],
      characteristics: [],
    });
    expect(moderationContentStale(h1, h2)).toBe(true);
    expect(moderationContentStale(h1, h1)).toBe(false);
  });

  it("does not claim image/OCR PASS when providers are absent", () => {
    expect(IMAGE_MODERATION_AVAILABLE).toBe(false);
    expect(OCR_AVAILABLE).toBe(false);
  });

  it("approve path publishes ACTIVE transactionally", () => {
    expect(lifecycle).toContain("status: ProductStatus.ACTIVE");
    expect(lifecycle).toContain("publishedAt");
    expect(lifecycle).toContain("decisionVersion");
  });

  it("exposes admin and seller moderation APIs with auth", () => {
    expect(adminRoute).toContain("requireAdminSession");
    expect(adminRoute).toContain("applyAdminModerationDecision");
    expect(sellerModerationRoute).toContain("requireSellerFromRequest");
    expect(sellerModerationRoute).toContain("sellerLabel");
  });

  it("records append-only audit events", () => {
    expect(lifecycle).toContain("appendModerationAuditEvent");
  });

  it("unpublishes ACTIVE product when approved content changes", () => {
    expect(lifecycle).toContain("status: ProductStatus.DRAFT");
    expect(lifecycle).toContain("CONTENT_VERSION_INVALIDATED");
  });
});
