import { evaluateCharacteristics } from "./characteristics-engine";
import { evaluateCategoryGuard } from "./category-guard";
import {
  detectEvidenceConflicts,
  highestSeverityMessage,
  mergeTriggeredRules,
  resolveDecisionClass,
} from "./evidence-fusion";
import { analyzePixelImageAndOcr } from "./image-ocr-engine";
import { buildEvaluationCompleteness } from "../evaluation-completeness";
import { loadLotPolicyV2Registry } from "./load-registry";
import { analyzeTitleDescriptionSignals, detectAlcoholFreeContext, detectNicotineFreeClaim, detectNicotinePatchContext, detectToyContext, matchPatterns } from "./text-engine";
import type {
  LotPolicyV2Registry,
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyEvidenceHit,
  PolicyRuleRecord,
} from "./types";
import { LOT_POLICY_V2 } from "./types";

const EVALUATOR_VERSION = "LOT_POLICY_V2_EVALUATOR/1.0.0";

function analyzeOcrTextPatterns(input: {
  registry: LotPolicyV2Registry;
  ocrText: string;
  evaluatedAt: string;
}): { hits: PolicyEvidenceHit[]; triggeredRules: PolicyRuleRecord[] } {
  if (!input.ocrText.trim()) return { hits: [], triggeredRules: [] };

  const { hits, triggeredRules } = analyzeTitleDescriptionSignals({
    title: input.ocrText,
    description: null,
    rules: input.registry.rules,
    patternGroups: input.registry.textPatternGroups.filter((g) => !g.groupId.startsWith("char_")),
    evaluatedAt: input.evaluatedAt,
  });

  return {
    hits: hits.map((h) => ({ ...h, source: "OCR_SIGNAL" as const })),
    triggeredRules,
  };
}

function computeConfidence(
  evidence: PolicyEvidenceHit[],
  decisionClass: string,
  notEvaluatedCount: number,
): number {
  if (decisionClass === "ALLOW" && evidence.length === 0 && notEvaluatedCount === 0) return 0.9;
  if (evidence.length === 0) return 0.4;
  const avg = evidence.reduce((s, e) => s + e.confidence, 0) / evidence.length;
  return Math.min(0.99, avg - notEvaluatedCount * 0.05);
}

export function evaluateLotPolicyV2(
  input: PolicyEvaluationInput,
  registry: LotPolicyV2Registry = loadLotPolicyV2Registry(),
): PolicyEvaluationResult {
  const evaluatedAt = new Date().toISOString();
  const notEvaluatedDimensions: string[] = [];

  const category = evaluateCategoryGuard({
    registry,
    categorySlug: input.categorySlug,
    productTypeSlug: input.productTypeSlug,
    evaluatedAt,
  });

  const text = analyzeTitleDescriptionSignals({
    title: input.title,
    description: input.description,
    rules: registry.rules,
    patternGroups: registry.textPatternGroups.filter((g) => !g.groupId.startsWith("char_")),
    evaluatedAt,
  });

  const imageOcr = analyzePixelImageAndOcr({
    imageEvaluation: input.imageEvaluation ?? null,
    evaluatedAt,
  });
  notEvaluatedDimensions.push(...imageOcr.notEvaluatedReasons);

  const hasImages = (input.imageUrls?.length ?? 0) > 0;
  if (hasImages && !input.imageEvaluation) {
    notEvaluatedDimensions.push("IMAGE_EVALUATION_PENDING");
  }

  const ocrPatterns = analyzeOcrTextPatterns({
    registry,
    ocrText: [imageOcr.ocrText, ...(input.imageAltTexts ?? [])].join("\n"),
    evaluatedAt,
  });

  let triggeredRules = mergeTriggeredRules(
    category.triggeredRules,
    mergeTriggeredRules(text.triggeredRules, ocrPatterns.triggeredRules),
  );

  const combinedText = `${input.title}\n${input.description ?? ""}`;
  const alcoholFree = detectAlcoholFreeContext(combinedText);
  const toyContext = detectToyContext(combinedText);
  const nicotinePatch = detectNicotinePatchContext(combinedText);

  if (alcoholFree) {
    triggeredRules = triggeredRules.filter((r) => r.policyId !== "LOT_ALCOHOL_REMOTE_V2");
  }
  if (nicotinePatch) {
    triggeredRules = triggeredRules.filter((r) => r.policyId !== "LOT_NICOTINE_PRODUCT_V2");
    const patchRule = registry.rules.find((r) => r.policyId === "LOT_NICOTINE_PATCH_MEDICAL_V2");
    if (patchRule) triggeredRules = mergeTriggeredRules(triggeredRules, [patchRule]);
  }
  const nicotineFreeClaim = detectNicotineFreeClaim(combinedText);
  if (nicotineFreeClaim) {
    triggeredRules = triggeredRules.filter(
      (r) => r.policyId !== "LOT_NICOTINE_PRODUCT_V2" && r.policyId !== "LOT_NICOTINE_LIQUID_V2",
    );
  }
  if (toyContext) {
    triggeredRules = triggeredRules.filter((r) => r.policyId !== "LOT_WEAPON_FIREARM_V2");
    const toyRule = registry.rules.find((r) => r.policyId === "LOT_WEAPON_TOY_V2");
    if (toyRule) triggeredRules = mergeTriggeredRules(triggeredRules, [toyRule]);
  }
  if (matchPatterns(input.title, ["парфюм", "духи", "туалетная вода"]).length > 0) {
    triggeredRules = triggeredRules.filter((r) => r.policyId !== "LOT_COSMETICS_V2");
  }

  const charEval = evaluateCharacteristics({
    registry,
    characteristics: input.characteristics,
    triggeredPolicyIds: triggeredRules.map((r) => r.policyId),
    evaluatedAt,
  });
  triggeredRules = mergeTriggeredRules(triggeredRules, charEval.triggeredRules);

  const imageRules = imageOcr.evidence
    .map((hit) => registry.rules.find((r) => r.policyId === hit.policyId))
    .filter((r): r is PolicyRuleRecord => Boolean(r));
  triggeredRules = mergeTriggeredRules(triggeredRules, imageRules);

  triggeredRules = triggeredRules.filter(
    (r) => r.decisionClass !== "ALLOW" || triggeredRules.filter((x) => x.decisionClass !== "ALLOW").length === 0,
  );

  if (charEval.missingRequiredFields.length > 0) {
    notEvaluatedDimensions.push(`MISSING_REQUIRED_CHARACTERISTICS:${charEval.missingRequiredFields.join(",")}`);
  }

  const evidence: PolicyEvidenceHit[] = [
    ...category.evidence,
    ...text.hits,
    ...imageOcr.evidence,
    ...ocrPatterns.hits,
    ...charEval.evidence,
  ];

  const conflicts = detectEvidenceConflicts(evidence, input.description);
  const decisionClass = resolveDecisionClass(triggeredRules, notEvaluatedDimensions, conflicts.length > 0);
  const { user, admin } = highestSeverityMessage(triggeredRules);

  const hasImagesForTitleOnly = (input.imageUrls?.length ?? 0) > 0;
  const titleDescOnly =
    hasImagesForTitleOnly &&
    !input.imageEvaluation &&
    text.triggeredRules.length === 0 &&
    ocrPatterns.triggeredRules.length === 0;

  let finalDecision = decisionClass;
  if (titleDescOnly && finalDecision === "ALLOW") {
    finalDecision = "NOT_EVALUATED";
    notEvaluatedDimensions.push("IMAGE_ONLY_LISTING_UNVERIFIED");
  }

  const nicotineEvidenceText = [input.title, input.description ?? "", imageOcr.ocrText].join(" ");
  const vapeLiquidAmbiguous =
    matchPatterns(input.title, ["вейп", "вэйп", "vape", "жидкость для", "жижа"]).length > 0 &&
    !matchPatterns(nicotineEvidenceText, ["никотин", "nicotine", "20 mg", "20mg", "mg/ml", "мг/мл"]).length &&
    !charEval.evidence.some((e) => e.policyId === "LOT_NICOTINE_LIQUID_V2");

  if (vapeLiquidAmbiguous && finalDecision !== "HARD_BLOCK") {
    const manualRule = registry.rules.find((r) => r.policyId === "LOT_VAPE_LIQUID_AMBIGUOUS_V2");
    if (manualRule) {
      triggeredRules = mergeTriggeredRules(triggeredRules, [manualRule]);
      finalDecision = "MANUAL_REVIEW";
    }
  }

  const humanReviewRequired =
    triggeredRules.some((r) => r.humanReviewRequired) ||
    finalDecision === "MANUAL_REVIEW" ||
    finalDecision === "RESTRICTED_REVIEW" ||
    finalDecision === "NOT_EVALUATED";

  const blockBeforeSubmit =
    category.blockBeforeSubmit || finalDecision === "HARD_BLOCK";

  const confidence = computeConfidence(evidence, finalDecision, notEvaluatedDimensions.length);

  const evaluationCompleteness = buildEvaluationCompleteness({
    hasImages: hasImagesForTitleOnly,
    imageEvaluation: input.imageEvaluation,
    policyResult: {
      policyVersion: LOT_POLICY_V2,
      decisionClass: finalDecision,
      recommendation: finalDecision,
      confidence,
      rulesTriggered: [...new Set(triggeredRules.map((r) => r.policyId))],
      evidence,
      conflicts,
      notEvaluatedDimensions: [...new Set(notEvaluatedDimensions)],
      humanReviewRequired,
      userMessage: user ?? category.userMessage,
      adminSummary: `${admin} · evaluator=${EVALUATOR_VERSION}`,
      blockBeforeSubmit: category.blockBeforeSubmit || finalDecision === "HARD_BLOCK",
    },
  });

  return {
    policyVersion: LOT_POLICY_V2,
    decisionClass: finalDecision,
    recommendation: finalDecision,
    confidence,
    rulesTriggered: [...new Set(triggeredRules.map((r) => r.policyId))],
    evidence,
    conflicts,
    notEvaluatedDimensions: [...new Set(notEvaluatedDimensions)],
    humanReviewRequired,
    userMessage: user ?? category.userMessage,
    adminSummary: `${admin} · evaluator=${EVALUATOR_VERSION}`,
    blockBeforeSubmit,
    evaluationCompleteness,
    imageEvaluationSummary: input.imageEvaluation ?? imageOcr.aggregate ?? null,
  };
}
