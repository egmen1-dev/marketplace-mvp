import neverAutoRegistry from "@/config/policies/lot-never-auto-v1.json";

import type { PolicyEvaluationResult } from "./policy-v2/types";
import type { LotImageEvaluationAggregate } from "./providers/types";

/** Policy IDs where visual-only recognition may be required for safe automation. */
const VISUAL_SENSITIVE_POLICY_IDS = new Set([
  "LOT_WEAPON_FIREARM_V2",
  "LOT_WEAPON_COLD_V2",
  "LOT_WEAPON_TOY_V2",
  "LOT_VAPE_DEVICE_V2",
  "LOT_VAPE_LIQUID_AMBIGUOUS_V2",
  "LOT_ALCOHOL_REMOTE_V2",
  "LOT_ADULT_CONTENT_V2",
  "LOT_FAKE_DOCUMENTS_V2",
  "LOT_OFFICIAL_DOCUMENTS_V2",
  "LOT_TOBACCO_REMOTE_SALE_V2",
  "LOT_NICOTINE_LIQUID_V2",
]);

const VISUAL_AMBIGUOUS_TITLE = [
  /вейп|vape|e[\s-]?liquid|жидкост/i,
  /игрушечн.*пистолет|nerf/i,
  /патрон|cartridge|ammo/i,
  /паспорт|удостоверени/i,
];

export type VisualObjectReviewRequirement = {
  required: boolean;
  reasons: string[];
};

export function requiresVisualObjectReview(input: {
  title: string;
  description?: string | null;
  rulesTriggered?: string[];
  imageEvaluation?: LotImageEvaluationAggregate | null;
  policyResult?: PolicyEvaluationResult | null;
}): VisualObjectReviewRequirement {
  const reasons: string[] = [];
  const blob = `${input.title} ${input.description ?? ""}`;

  if (input.policyResult?.notEvaluatedDimensions.some((d) => d.includes("PIXEL_IMAGE_CLASSIFICATION"))) {
    reasons.push("PIXEL_IMAGE_CLASSIFICATION_NOT_AVAILABLE");
  }

  for (const ruleId of input.rulesTriggered ?? input.policyResult?.rulesTriggered ?? []) {
    if (VISUAL_SENSITIVE_POLICY_IDS.has(ruleId)) {
      reasons.push(`RULE_REQUIRES_VISUAL_CONFIRMATION:${ruleId}`);
    }
  }

  if (VISUAL_AMBIGUOUS_TITLE.some((re) => re.test(blob))) {
    reasons.push("AMBIGUOUS_TITLE_REQUIRES_VISUAL_CONFIRMATION");
  }

  const hasImages = (input.imageEvaluation?.perImage.length ?? 0) > 0;
  const ocrEmpty =
    hasImages &&
    input.imageEvaluation?.ocrStatus === "EVALUATED" &&
    !input.imageEvaluation.combinedOcrText.trim();
  if (ocrEmpty && VISUAL_AMBIGUOUS_TITLE.some((re) => re.test(blob))) {
    reasons.push("IMAGE_PRESENT_BUT_NO_OCR_TEXT_FOR_AMBIGUOUS_PRODUCT");
  }

  return { required: reasons.length > 0, reasons: [...new Set(reasons)] };
}

export function isNeverAutoPolicy(ruleIds: string[]): boolean {
  const entries = neverAutoRegistry.entries as Array<{ policyIds?: string[] }>;
  const blocked = new Set(entries.flatMap((e) => e.policyIds ?? []));
  return ruleIds.some((id) => blocked.has(id));
}
