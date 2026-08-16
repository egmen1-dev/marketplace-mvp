import type { CognitiveMemoryEvent } from "./types";

const events: CognitiveMemoryEvent[] = [];

export function appendMemoryEvent(
  input: Omit<CognitiveMemoryEvent, "id" | "createdAt">,
): CognitiveMemoryEvent {
  const event: CognitiveMemoryEvent = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  events.push(event);
  return event;
}

export function listMemoryEvents(filter?: {
  entityType?: string;
  entityId?: string;
  type?: string;
}): CognitiveMemoryEvent[] {
  return events.filter((e) => {
    if (filter?.entityType && e.entity.type !== filter.entityType) return false;
    if (filter?.entityId && e.entity.id !== filter.entityId) return false;
    if (filter?.type && e.type !== filter.type) return false;
    return true;
  });
}

export function resetMemoryStore(): void {
  events.length = 0;
}

export type { CognitiveMemoryEvent };
