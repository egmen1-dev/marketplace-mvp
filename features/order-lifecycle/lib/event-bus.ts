import type {
  OrderActorRole,
  OrderEventType,
  OrderFulfillmentType,
  OrderStatus,
  Prisma,
} from "@prisma/client";

export type OrderLifecycleEvent = {
  orderId: string;
  orderNumber: string;
  type: OrderEventType;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  fulfillmentType: OrderFulfillmentType;
  actorRole: OrderActorRole;
  actorUserId: string | null;
  completedAt: Date | null;
  reviewEligibleAt: Date | null;
  payload?: Prisma.InputJsonValue;
};

type Handler = (event: OrderLifecycleEvent) => void | Promise<void>;

const handlers = new Map<string, Set<Handler>>();

/**
 * In-process event bus. Ranking / Reviews / Analytics subscribe here.
 * Later can fan-out to a queue without changing publishers.
 */
export function subscribeOrderLifecycle(
  key: string,
  handler: Handler,
): () => void {
  let set = handlers.get(key);
  if (!set) {
    set = new Set();
    handlers.set(key, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
  };
}

export async function publishOrderLifecycleEvent(
  event: OrderLifecycleEvent,
): Promise<void> {
  const all = [...handlers.values()].flatMap((set) => [...set]);
  await Promise.allSettled(all.map((h) => Promise.resolve(h(event))));
}

/** Test helper — clear all subscribers. */
export function __resetOrderLifecycleBus(): void {
  handlers.clear();
}
