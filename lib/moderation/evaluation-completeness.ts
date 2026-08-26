import type { LotImageEvaluationAggregate } from "./providers/types";
import type { PolicyEvaluationResult } from "./policy-v2/types";

export type EvaluationDimensionStatus =
  | "EVALUATED"
  | "NOT_EVALUATED"
  | "UNAVAILABLE"
  | "FAILED"
  | "TIMEOUT"
  | "NOT_APPLICABLE";

export type EvaluationCompleteness = {
  textEvaluated: EvaluationDimensionStatus;
  categoryEvaluated: EvaluationDimensionStatus;
  characteristicsEvaluated: EvaluationDimensionStatus;
  imagesEvaluated: EvaluationDimensionStatus;
  ocrEvaluated: EvaluationDimensionStatus;
  allRequiredEvaluated: boolean;
  blockingReasons: string[];
};

export function buildEvaluationCompleteness(input: {
  hasImages: boolean;
  imageEvaluation?: LotImageEvaluationAggregate | null;
  policyResult: PolicyEvaluationResult;
}): EvaluationCompleteness {
  const blockingReasons: string[] = [];

  const textEvaluated: EvaluationDimensionStatus = "EVALUATED";
  const categoryEvaluated: EvaluationDimensionStatus = input.policyResult.evidence.some(
    (e) => e.source === "CATEGORY_SIGNAL",
  )
    ? "EVALUATED"
    : "NOT_APPLICABLE";

  const characteristicsEvaluated: EvaluationDimensionStatus =
    input.policyResult.notEvaluatedDimensions.some((d) => d.startsWith("MISSING_REQUIRED_CHARACTERISTICS"))
      ? "NOT_EVALUATED"
      : "EVALUATED";

  let imagesEvaluated: EvaluationDimensionStatus = input.hasImages ? "NOT_EVALUATED" : "NOT_APPLICABLE";
  let ocrEvaluated: EvaluationDimensionStatus = input.hasImages ? "NOT_EVALUATED" : "NOT_APPLICABLE";

  if (input.hasImages && input.imageEvaluation) {
    imagesEvaluated = mapProviderStatus(input.imageEvaluation.imageStatus);
    ocrEvaluated = mapProviderStatus(input.imageEvaluation.ocrStatus);
    if (imagesEvaluated === "FAILED" || imagesEvaluated === "TIMEOUT") {
      blockingReasons.push(`IMAGE_MODERATION_${imagesEvaluated}`);
    }
    if (ocrEvaluated === "FAILED" || ocrEvaluated === "TIMEOUT") {
      blockingReasons.push(`OCR_${ocrEvaluated}`);
    }
    if (imagesEvaluated === "UNAVAILABLE") blockingReasons.push("IMAGE_MODERATION_UNAVAILABLE");
    if (ocrEvaluated === "UNAVAILABLE") blockingReasons.push("OCR_UNAVAILABLE");
  } else if (input.hasImages) {
    blockingReasons.push("IMAGE_EVALUATION_PENDING");
  }

  if (input.policyResult.notEvaluatedDimensions.some((d) => d.startsWith("PIXEL_"))) {
    blockingReasons.push("PIXEL_EVALUATION_INCOMPLETE");
  }

  const allRequiredEvaluated =
    textEvaluated === "EVALUATED" &&
    characteristicsEvaluated !== "NOT_EVALUATED" &&
    (!input.hasImages ||
      (imagesEvaluated === "EVALUATED" && ocrEvaluated === "EVALUATED"));

  return {
    textEvaluated,
    categoryEvaluated,
    characteristicsEvaluated,
    imagesEvaluated,
    ocrEvaluated,
    allRequiredEvaluated,
    blockingReasons: [...new Set(blockingReasons)],
  };
}

function mapProviderStatus(
  status: LotImageEvaluationAggregate["ocrStatus"],
): EvaluationDimensionStatus {
  if (status === "EVALUATED") return "EVALUATED";
  if (status === "FAILED") return "FAILED";
  if (status === "TIMEOUT") return "TIMEOUT";
  if (status === "UNAVAILABLE") return "UNAVAILABLE";
  return "NOT_EVALUATED";
}

/** Policy classes that must never auto-approve even under GUARDED_AUTO. */
export const NEVER_AUTO_APPROVE_POLICY_IDS = new Set([
  "LOT_VAPE_LIQUID_AMBIGUOUS_V2",
  "LOT_NICOTINE_LIQUID_V2",
  "LOT_NICOTINE_PRODUCT_V2",
  "LOT_VAPE_DEVICE_V2",
  "LOT_MEDICINE_OTC_V2",
  "LOT_MEDICINE_RX_V2",
  "LOT_MEDICAL_DEVICE_V2",
  "LOT_WEAPON_COLD_V2",
  "LOT_WEAPON_TOY_V2",
  "LOT_OFFICIAL_DOCUMENTS_V2",
  "LOT_FAKE_DOCUMENTS_V2",
  "LOT_HAZCHEM_V2",
  "LOT_POISON_V2",
]);

export function isNeverAutoApprove(policyIds: string[]): boolean {
  return policyIds.some((id) => NEVER_AUTO_APPROVE_POLICY_IDS.has(id));
}
