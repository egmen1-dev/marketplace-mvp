/** Candidate weights V1 — not final; calibrate via Ranking Lab. */
export const COMMERCIAL_QUALITY_WEIGHTS_V1 = {
  photo: 0.18,
  thumbnail: 0.1,
  description: 0.12,
  seo: 0.08,
  attributes: 0.1,
  video: 0.05,
  consistency: 0.12,
  commercialValue: 0.15,
  compliance: 0.05,
  buyerValue: 0.05,
} as const;

export type CommercialQualityWeightKey = keyof typeof COMMERCIAL_QUALITY_WEIGHTS_V1;
