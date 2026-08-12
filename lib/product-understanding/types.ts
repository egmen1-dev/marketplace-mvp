/**
 * AI Product Understanding types — suggestion layer (human confirms before save).
 */

export type ConfidenceLevel = "high" | "medium" | "low";

export type FieldConfidence = {
  score: number;
  level: ConfidenceLevel;
};

export type UnderstandProductInput = {
  title: string;
  description?: string | null;
  categoryHint?: string | null;
  images?: string[];
};

export type SuggestedCharacteristic = {
  definitionId?: string;
  slug: string;
  name: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  confidence: FieldConfidence;
  /** Raw extracted label before mapping to taxonomy */
  extractedLabel?: string;
};

export type ProductUnderstandingResult = {
  categorySuggestion: {
    id: string | null;
    name: string | null;
    slug: string | null;
    breadcrumb: string[];
    confidence: FieldConfidence;
  } | null;
  productTypeSuggestion: {
    id: string;
    name: string;
    slug: string;
    categoryId: string;
    breadcrumb: string[];
    confidence: FieldConfidence;
  } | null;
  brand: {
    name: string;
    slug: string;
    brandId: string | null;
    confidence: FieldConfidence;
  } | null;
  model: {
    name: string;
    confidence: FieldConfidence;
  } | null;
  characteristics: SuggestedCharacteristic[];
  aliases: string[];
  seo: {
    title: string | null;
    description: string | null;
    shortDescription: string | null;
  };
  confidence: {
    overall: FieldConfidence;
    category: FieldConfidence;
    productType: FieldConfidence;
    brand: FieldConfidence;
    characteristics: FieldConfidence;
  };
  /** Deterministic engine version — not an LLM claim */
  engine: "rules-v1";
};

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

export function toFieldConfidence(score: number): FieldConfidence {
  const clamped = Math.max(0, Math.min(0.99, Math.round(score * 100) / 100));
  return { score: clamped, level: confidenceLevel(clamped) };
}
