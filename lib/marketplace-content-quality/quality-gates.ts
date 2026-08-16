import type { PhotoQualityBundle } from "./photo-quality";
import type { QualityGateCode, TopEligibility } from "./types";

export type QualityGateEvaluation = {
  topEligibility: TopEligibility;
  qualityGateFailed: boolean;
  failedGates: QualityGateCode[];
  blockers: string[];
};

type GateInput = {
  photo: PhotoQualityBundle;
  consistencySerious: boolean;
  complianceHardBlock: boolean;
  complianceStatus: string;
  primaryPhotoScore: number;
};

export function evaluateContentQualityGates(input: GateInput): QualityGateEvaluation {
  const failedGates: QualityGateCode[] = [];
  const blockers: string[] = [];

  if (input.complianceHardBlock) {
    if (input.complianceStatus === "PROHIBITED") {
      failedGates.push("PROHIBITED_PRODUCT");
      blockers.push("Запрещённый товар");
    }
    if (input.complianceStatus === "MODERATION_REJECTED") {
      failedGates.push("MODERATION_REJECTED");
      blockers.push("Модерация не пройдена");
    }
  }

  if (input.photo.relevance.irrelevant || input.photo.relevance.score < 15) {
    failedGates.push("IRRELEVANT_CONTENT");
    blockers.push("Фото не соответствуют товару");
  }

  if (input.photo.identity.mismatch) {
    failedGates.push("PRODUCT_IDENTITY_MISMATCH");
    blockers.push("На фото разные товары");
  }

  if (input.primaryPhotoScore < 12 || input.photo.photo.uploadedPhotoCount === 0) {
    failedGates.push("NO_RELEVANT_MAIN_PHOTO");
    blockers.push("Нет релевантного главного фото");
  }

  if (input.consistencySerious) {
    failedGates.push("SERIOUS_TEXT_IMAGE_CONTRADICTION");
    blockers.push("Серьёзное противоречие в данных карточки");
  }

  const qualityGateFailed = failedGates.length > 0;
  return {
    topEligibility: qualityGateFailed ? "BLOCKED" : "ELIGIBLE",
    qualityGateFailed,
    failedGates,
    blockers,
  };
}
