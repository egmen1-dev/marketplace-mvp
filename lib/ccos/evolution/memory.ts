import type { EvolutionMemoryEvent, EvolutionMemoryEventKind } from "./types";

const events: EvolutionMemoryEvent[] = [];

export function appendEvolutionMemoryEvent(input: {
  kind: EvolutionMemoryEventKind;
  candidateId?: string;
  actor: string;
  detail: string;
  metadata?: Record<string, unknown>;
}): EvolutionMemoryEvent {
  const event: EvolutionMemoryEvent = {
    id: `evo-mem-${events.length + 1}`,
    kind: input.kind,
    candidateId: input.candidateId,
    actor: input.actor,
    detail: input.detail,
    timestamp: new Date().toISOString(),
    metadata: input.metadata,
  };
  events.push(event);
  return event;
}

export function listEvolutionMemoryEvents(candidateId?: string): EvolutionMemoryEvent[] {
  if (!candidateId) return [...events];
  return events.filter((e) => e.candidateId === candidateId);
}

export function resetEvolutionMemory(): void {
  events.length = 0;
}
