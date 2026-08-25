import type { ImageModerationSignals } from "../types";

/** v1: no CV/OCR provider connected — honest NOT_EVALUATED. */
export function analyzeImageSignals(input: {
  imageCount: number;
  imageUrls: string[];
}): { imageSignals: ImageModerationSignals; reasons: [] } {
  void input.imageUrls;
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

export const IMAGE_MODERATION_AVAILABLE = false;
export const OCR_AVAILABLE = false;
