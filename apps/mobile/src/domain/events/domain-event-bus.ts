/**
 * Sprint 93 — In-process domain event bus (ADR-009).
 */

import type { DomainEvent, DomainEventBus, DomainEventType } from "../contracts/events";

type Handler<T extends DomainEventType> = (event: Extract<DomainEvent, { type: T }>) => void;

export class InProcessDomainEventBus implements DomainEventBus {
  private readonly handlers = new Map<DomainEventType, Set<Handler<DomainEventType>>>();

  publish(event: DomainEvent): void {
    const set = this.handlers.get(event.type);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(event as Extract<DomainEvent, { type: typeof event.type }>);
      } catch {
        // Event handlers must not break publishers.
      }
    }
  }

  subscribe<T extends DomainEventType>(
    type: T,
    handler: (event: Extract<DomainEvent, { type: T }>) => void,
  ): () => void {
    const existing = this.handlers.get(type) ?? new Set();
    const wrapped = handler as Handler<DomainEventType>;
    existing.add(wrapped);
    this.handlers.set(type, existing);
    return () => {
      existing.delete(wrapped);
      if (existing.size === 0) this.handlers.delete(type);
    };
  }
}

let sharedBus: InProcessDomainEventBus | null = null;

export function getDomainEventBus(): InProcessDomainEventBus {
  if (!sharedBus) sharedBus = new InProcessDomainEventBus();
  return sharedBus;
}

export function resetDomainEventBusForTests(): void {
  sharedBus = null;
}
