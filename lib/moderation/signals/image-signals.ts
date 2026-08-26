import type { LotImageEvaluationAggregate } from "../providers/types";
import type { ImageModerationSignals } from "../types";

/** V1 image signal bridge from pixel evaluation (EPIC 189.1). */
export function analyzeImageSignalsFromEvaluation(
  evaluation: LotImageEvaluationAggregate | null,
): { imageSignals: ImageModerationSignals; reasons: [] } {
  if (!evaluation || evaluation.perImage.length === 0) {
    return {
      imageSignals: {
        evaluation: "NOT_EVALUATED",
        adultContent: "NOT_EVALUATED",
        weaponLikelihood: "NOT_EVALUATED",
        contactInfoDetected: "NOT_EVALUATED",
        qrDetected: "NOT_EVALUATED",
        ocrAvailable: false,
        imageText: null,
      },
      reasons: [],
    };
  }

  const ocrText = evaluation.combinedOcrText || null;
  const ocrAvailable = evaluation.ocrStatus === "EVALUATED";
  const contact = evaluation.perImage.some((p) =>
    p.image.policySignals.some((s) => s.policyClass === "contact"),
  );
  const qr = evaluation.perImage.some((p) => p.image.qrDetected);
  const weapon = evaluation.perImage.some((p) =>
    p.image.policySignals.some((s) => s.policyClass === "weapons"),
  );
  const nicotine = evaluation.perImage.some((p) =>
    p.image.policySignals.some((s) => s.policyClass === "nicotine" || s.policyClass === "vape"),
  );

  const flagged = contact || qr || weapon || nicotine;
  const evaluated = evaluation.imageStatus === "EVALUATED" && evaluation.ocrStatus === "EVALUATED";

  return {
    imageSignals: {
      evaluation: flagged ? "FLAGGED" : evaluated ? "SAFE" : "NOT_EVALUATED",
      adultContent: "NOT_EVALUATED",
      weaponLikelihood: weapon ? "FLAGGED" : evaluated ? "SAFE" : "NOT_EVALUATED",
      contactInfoDetected: contact ? "FLAGGED" : evaluated ? "SAFE" : "NOT_EVALUATED",
      qrDetected: qr ? "FLAGGED" : evaluated ? "SAFE" : "NOT_EVALUATED",
      ocrAvailable,
      imageText: ocrText,
    },
    reasons: [],
  };
}

/** @deprecated use analyzeImageSignalsFromEvaluation */
export function analyzeImageSignals(input: {
  imageCount: number;
  imageUrls: string[];
}): { imageSignals: ImageModerationSignals; reasons: [] } {
  void input;
  return analyzeImageSignalsFromEvaluation(null);
}

export const IMAGE_MODERATION_AVAILABLE = process.env.MODERATION_IMAGE_PROVIDER !== "unavailable";
export const OCR_AVAILABLE = process.env.MODERATION_OCR_PROVIDER !== "unavailable";
