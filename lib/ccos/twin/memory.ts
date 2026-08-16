import type { TwinMemoryRecord, TwinResult, TwinAppId } from "./types";

const memory: TwinMemoryRecord[] = [];

export function saveTwinSimulationMemory(input: {
  productId: string;
  app: TwinAppId;
  result: TwinResult;
}): TwinMemoryRecord {
  const record: TwinMemoryRecord = {
    id: `twin_mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    productId: input.productId,
    app: input.app,
    scenarioId: input.result.scenarioId,
    scenarioLabel: input.result.scenarioLabel,
    predicted: input.result.predicted,
    confidence: input.result.confidence.overall,
    createdAt: new Date().toISOString(),
    accuracy: null,
  };
  memory.push(record);
  return record;
}

export function recordTwinActualOutcome(input: {
  memoryId: string;
  actual: NonNullable<TwinMemoryRecord["actualOutcome"]>;
}): TwinMemoryRecord | null {
  const record = memory.find((m) => m.id === input.memoryId);
  if (!record) return null;
  record.actualOutcome = input.actual;

  const predictedCtr = record.predicted.ctrDeltaPct ?? 0;
  const actualCtr = input.actual.ctrDeltaPct ?? 0;
  if (predictedCtr === 0 && actualCtr === 0) {
    record.accuracy = 1;
  } else {
    const error = Math.abs(predictedCtr - actualCtr) / Math.max(1, Math.abs(predictedCtr));
    record.accuracy = Math.max(0, Math.round((1 - Math.min(1, error)) * 100) / 100);
  }
  return record;
}

export function listTwinMemory(filter?: {
  productId?: string;
  app?: TwinAppId;
}): TwinMemoryRecord[] {
  return memory.filter((m) => {
    if (filter?.productId && m.productId !== filter.productId) return false;
    if (filter?.app && m.app !== filter.app) return false;
    return true;
  });
}

export function resetTwinMemory(): void {
  memory.length = 0;
}
