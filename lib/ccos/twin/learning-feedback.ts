import { proposeHypothesis } from "@/lib/ccos/knowledge/hypothesis";
import type { CognitiveHypothesis } from "@/lib/ccos/knowledge/types";
import type { TwinMemoryRecord } from "./types";

export function createLearningFeedbackFromTwinError(input: {
  record: TwinMemoryRecord;
  errorThreshold?: number;
}): CognitiveHypothesis | null {
  const threshold = input.errorThreshold ?? 0.15;
  const predicted = input.record.predicted.ctrDeltaPct ?? 0;
  const actual = input.record.actualOutcome?.ctrDeltaPct ?? 0;
  const error = Math.abs(predicted - actual) / Math.max(1, Math.abs(predicted));

  if (error < threshold) return null;

  return proposeHypothesis({
    title: `Twin prediction error: ${input.record.scenarioLabel}`,
    claim: `Симуляция «${input.record.scenarioLabel}» ошиблась: прогноз CTR ${predicted}%, факт ${actual}%. Нужна новая гипотеза и эксперимент.`,
    evidenceIds: [],
    proposedBy: "learning_engine",
    confidence: 0.55,
  });
}
