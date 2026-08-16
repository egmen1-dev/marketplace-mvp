import type { KnowledgeEvidence, SellerFeedbackRecord } from "./types";
import { createEvidence } from "./evidence";
import { getKnowledgeRepository } from "./repository";

const feedbackRecords: SellerFeedbackRecord[] = [];

export function recordSellerFeedback(input: {
  productId: string;
  recommendationId: string;
  recommendationTitle: string;
  outcome: SellerFeedbackRecord["outcome"];
  comment?: string;
}): SellerFeedbackRecord {
  const evidence = createEvidence({
    observationIds: [],
    claim: `Seller feedback: ${input.outcome} for "${input.recommendationTitle}"`,
    confidence: input.outcome === "helped" ? 0.75 : input.outcome === "partial" ? 0.55 : 0.4,
    scope: { pack: "seller", apps: ["marketplace"] },
  });
  evidence.author = { type: "seller_feedback", id: input.productId };
  getKnowledgeRepository().saveEvidence(evidence);

  const record: SellerFeedbackRecord = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    productId: input.productId,
    recommendationId: input.recommendationId,
    recommendationTitle: input.recommendationTitle,
    outcome: input.outcome,
    comment: input.comment,
    evidenceId: evidence.id,
    createdAt: new Date().toISOString(),
  };
  feedbackRecords.push(record);
  return record;
}

export function listSellerFeedback(productId?: string): SellerFeedbackRecord[] {
  return productId
    ? feedbackRecords.filter((r) => r.productId === productId)
    : [...feedbackRecords];
}

export function feedbackAsEvidence(productId: string): KnowledgeEvidence[] {
  return listSellerFeedback(productId)
    .map((r) => (r.evidenceId ? getKnowledgeRepository().getEvidence(r.evidenceId) : null))
    .filter((e): e is KnowledgeEvidence => e != null);
}

export function resetSellerFeedback(): void {
  feedbackRecords.length = 0;
}
