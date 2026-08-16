import type { ContentQualityReEvaluationEvent } from "./types";

const pending = new Set<string>();

export function scheduleQualityReEvaluation(
  productId: string,
  _event: ContentQualityReEvaluationEvent,
): void {
  pending.add(productId);
}

export function drainPendingQualityEvaluations(limit = 50): string[] {
  const batch = [...pending].slice(0, limit);
  for (const id of batch) pending.delete(id);
  return batch;
}

export function pendingQualityEvaluationCount(): number {
  return pending.size;
}
