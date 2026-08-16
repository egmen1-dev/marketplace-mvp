import type { ContextConfidence, CognitiveContext } from "./types";

export function computeContextConfidence(parts: {
  query?: number;
  category?: number;
  buyer?: number;
  seller?: number;
  device?: number;
}): ContextConfidence {
  const values = Object.values(parts).filter((v): v is number => v != null);
  const overall =
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0.35;
  return { overall, ...parts };
}

export function mergeContextConfidence(
  base: ContextConfidence,
  patch: Partial<ContextConfidence>,
): ContextConfidence {
  return computeContextConfidence({ ...base, ...patch });
}

export function contextConfidenceLabel(confidence: ContextConfidence): string {
  if (confidence.overall >= 0.75) return "HIGH";
  if (confidence.overall >= 0.45) return "MEDIUM";
  return "LOW";
}

export function hasUsableQueryContext(context: CognitiveContext): boolean {
  return Boolean(context.query?.raw && (context.query.confidence ?? 0) >= 0.4);
}
