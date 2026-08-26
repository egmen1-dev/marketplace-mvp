import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { evaluateLotPolicyV2 } from "@/lib/moderation/policy-v2/evaluate";
import { loadLotPolicyV2Registry } from "@/lib/moderation/policy-v2/load-registry";
import { normalizePolicyText, matchPatterns, detectAccessoryContext, shouldTreatXxxAsAdultContent, detectDrillChuckContext } from "@/lib/moderation/policy-v2/text-engine";
import {
  detectEvidenceConflicts,
  resolveDecisionClass,
} from "@/lib/moderation/policy-v2/evidence-fusion";
import { automationVerdict, canAutoApprove } from "@/lib/moderation/policy-v2/safe-auto-approval";
import type { PolicyDecisionClass } from "@/lib/moderation/policy-v2/types";

type Fixture = {
  id: string;
  tags: string[];
  expected: PolicyDecisionClass;
  input: Record<string, unknown>;
};

const fixtureFile = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/policy-v2/fixtures.json"), "utf8"),
) as { count: number; fixtures: Fixture[] };

const registry = loadLotPolicyV2Registry();

describe("LOT_POLICY_V2 registry", () => {
  it("loads machine-readable registry with required metadata", () => {
    expect(registry.version).toBe("LOT_POLICY_V2_1");
    expect(registry.rules.length).toBeGreaterThanOrEqual(40);
    expect(registry.textPatternGroups.length).toBeGreaterThanOrEqual(40);
    for (const rule of registry.rules) {
      expect(rule.policyId).toBeTruthy();
      expect(rule.userMessage ?? rule.adminMessage).toBeTruthy();
      expect(rule.jurisdiction).toBe("RU");
    }
  });
});

describe("LOT_POLICY_V2 text engine", () => {
  it("normalizes obfuscation", () => {
    expect(normalizePolicyText("v@pe жидк0сть")).toContain("vape");
    expect(normalizePolicyText("жидк0сть")).toContain("жидкость");
  });

  it("detects accessory context separately from main product", () => {
    expect(detectAccessoryContext("Чехол для вейпа")).toBe(true);
    expect(detectAccessoryContext("Жидкость для вейпа")).toBe(false);
  });

  it("matches spaced obfuscation", () => {
    expect(matchPatterns("в е й п", ["вейп"]).length).toBeGreaterThan(0);
  });

  it("suppresses audit xxx filler but keeps explicit adult xxx", () => {
    expect(shouldTreatXxxAsAdultContent("xxxxxxxxxxxxxxxx")).toBe(false);
    expect(shouldTreatXxxAsAdultContent("xxx explicit 18+")).toBe(true);
    expect(shouldTreatXxxAsAdultContent("Sony Alpha XXX-500")).toBe(false);
  });

  it("detects SDS+ drill chuck context", () => {
    expect(detectDrillChuckContext("Перфоратор с патроном SDS+")).toBe(true);
    expect(detectDrillChuckContext("Патроны 9мм для пистолета")).toBe(false);
  });
});

describe("LOT_POLICY_V2 evidence fusion", () => {
  it("detects nicotine description vs OCR conflict", () => {
    const conflicts = detectEvidenceConflicts(
      [
        {
          source: "OCR_SIGNAL",
          policyId: "LOT_NICOTINE_LIQUID_V2",
          confidence: 0.9,
          matchedValue: "nicotine 20mg/ml",
          engineVersion: "test",
          evaluatedAt: new Date().toISOString(),
        },
      ],
      "без никотина",
    );
    expect(conflicts).toContain("DESCRIPTION_CLAIMS_NO_NICOTINE_BUT_EVIDENCE_SUGGESTS_NICOTINE");
  });

  it("prefers HARD_BLOCK over ALLOW in precedence", () => {
    const decision = resolveDecisionClass(
      [
        {
          policyId: "A",
          category: "x",
          subcategory: "x",
          decisionClass: "HARD_BLOCK",
          severity: "CRITICAL",
          jurisdiction: "RU",
          effectiveFrom: "2026-08-26",
          sourceUrls: [],
          detectionSignals: [],
          humanReviewRequired: true,
          buyerExposureRule: "BLOCK_PERMANENT",
          userMessage: "block",
          adminMessage: "block",
        },
      ],
      [],
      false,
    );
    expect(decision).toBe("HARD_BLOCK");
  });

  it("NOT_EVALUATED when critical dimensions missing and no restrictive rules", () => {
    expect(resolveDecisionClass([], ["PIXEL_OCR_NOT_AVAILABLE"], false)).toBe("NOT_EVALUATED");
  });
});

describe("LOT_POLICY_V2 — Жидкость для вэйпа case", () => {
  it("classifies ambiguous vape liquid as MANUAL_REVIEW without nicotine evidence", () => {
    const result = evaluateLotPolicyV2({
      title: "Жидкость для вэйпа",
      description: "фруктовый вкус",
      imageUrls: ["/staging/vape-liquid.jpg"],
      imageAltTexts: [""],
    });
    expect(result.decisionClass).toBe("MANUAL_REVIEW");
    expect(result.rulesTriggered).toContain("LOT_VAPE_LIQUID_AMBIGUOUS_V2");
    expect(result.notEvaluatedDimensions.some((d) => d.includes("IMAGE_EVALUATION") || d.includes("PIXEL"))).toBe(true);
  });

  it("hard-blocks when nicotine concentration is evidenced in characteristics", () => {
    const result = evaluateLotPolicyV2({
      title: "Жидкость для вэйпа",
      description: "без никотина",
      characteristics: [{ name: "Никотин", value: "20 mg/ml" }],
    });
    expect(result.decisionClass).toBe("HARD_BLOCK");
    expect(result.conflicts.length).toBeGreaterThan(0);
  });
});

describe("LOT_POLICY_V2 fixture matrix", () => {
  it(`evaluates ${fixtureFile.count} fixtures`, () => {
    const mismatches: string[] = [];
    for (const fx of fixtureFile.fixtures) {
      const result = evaluateLotPolicyV2(fx.input as Parameters<typeof evaluateLotPolicyV2>[0]);
      const acceptable =
        result.decisionClass === fx.expected ||
        (fx.expected === "NOT_EVALUATED" && result.notEvaluatedDimensions.length > 0) ||
        (fx.tags.includes("not-evaluated") && result.notEvaluatedDimensions.length > 0);
      if (!acceptable) {
        mismatches.push(`${fx.id}: expected ${fx.expected}, got ${result.decisionClass}`);
      }
    }
    expect(mismatches, mismatches.slice(0, 10).join("\n")).toHaveLength(0);
  });
});

describe("LOT_POLICY_V2 safe auto-approval", () => {
  it("does not auto-approve when pixel OCR unavailable", () => {
    const result = evaluateLotPolicyV2({
      title: "Дрель",
      description: "Новая",
      imageUrls: ["/a.jpg"],
    });
    expect(
      canAutoApprove(
        { ...result, decisionClass: "ALLOW", rulesTriggered: [], conflicts: [], humanReviewRequired: false },
        "GUARDED_AUTO",
      ),
    ).toBe(false);
  });

  it("automation verdict is NOT_READY until image/OCR operational", () => {
    expect(
      automationVerdict({
        policyResearchComplete: true,
        imageEngineOperational: false,
        ocrOperational: false,
        criticalFalseNegatives: 0,
      }),
    ).toBe("NOT_READY_FOR_AUTOMATION");
  });
});
