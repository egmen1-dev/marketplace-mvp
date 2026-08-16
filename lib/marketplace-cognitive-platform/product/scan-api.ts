import type { ProductUnderstanding } from "@/lib/ccos/product";

export type CameraScanResponse = {
  productIdentity: ProductUnderstanding["identity"];
  genome: { overall: number | null; confidence: number };
  mainIssues: string[];
  improvements: string[];
  nextStep: string | null;
  confidence: ProductUnderstanding["confidence"];
  advisoryOnly: true;
};

export function toCameraScanResponse(
  understanding: ProductUnderstanding,
  nextStepTitle?: string | null,
): CameraScanResponse {
  const mainIssues = [
    ...understanding.identity.conflicts.map((c) => c.explanation),
    ...understanding.categoryPack.typicalMistakes.slice(0, 2),
  ];
  const improvements = understanding.categoryPack.bestPractices.slice(0, 3);

  return {
    productIdentity: understanding.identity,
    genome: {
      overall: understanding.genome.overall,
      confidence: understanding.genome.confidence,
    },
    mainIssues,
    improvements,
    nextStep: nextStepTitle ?? improvements[0] ?? null,
    confidence: understanding.confidence,
    advisoryOnly: true,
  };
}
