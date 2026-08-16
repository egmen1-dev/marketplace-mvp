import type { UniversalObservation } from "./types";
import { recordObservations } from "./record";
import { trackCcosEvent } from "../telemetry";

export type ObservationBusMessage = {
  app: UniversalObservation["app"];
  observations: UniversalObservation[];
  publishedAt: string;
};

const subscribers: Array<(message: ObservationBusMessage) => void> = [];

export function subscribeObservationBus(
  handler: (message: ObservationBusMessage) => void,
): () => void {
  subscribers.push(handler);
  return () => {
    const idx = subscribers.indexOf(handler);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
}

export function publishObservationsToBus(input: {
  app: UniversalObservation["app"];
  observations: UniversalObservation[];
}): { recorded: UniversalObservation[]; errors: string[] } {
  const stamped = input.observations.map((o) => ({
    ...o,
    app: input.app,
  }));

  const { recorded, errors } = recordObservations(stamped);

  const message: ObservationBusMessage = {
    app: input.app,
    observations: recorded,
    publishedAt: new Date().toISOString(),
  };

  for (const handler of subscribers) {
    handler(message);
  }

  trackCcosEvent("ccos_observation_bus_published");
  return {
    recorded,
    errors: errors.flatMap((e) => e.errors),
  };
}

export function resetObservationBusSubscribers(): void {
  subscribers.length = 0;
}
