import type {
  ObservationPublisher,
  PublisherContext,
  PublisherHealth,
  UniversalObservation,
} from "./types";
import { recordObservations } from "./record";
import { trackCcosEvent } from "../telemetry";

const publishers: ObservationPublisher[] = [];

export function registerPublisher(publisher: ObservationPublisher): void {
  if (publishers.some((p) => p.name === publisher.name)) return;
  publishers.push(publisher);
}

export function listPublishers(): readonly ObservationPublisher[] {
  return publishers;
}

export function resetPublisherRegistry(): void {
  publishers.length = 0;
}

export async function runPublishers(
  context: PublisherContext,
): Promise<{
  observations: UniversalObservation[];
  publisherHealth: PublisherHealth[];
  recordErrors: Array<{ metric: string; errors: string[] }>;
}> {
  const observations: UniversalObservation[] = [];
  const publisherHealth: PublisherHealth[] = [];
  const recordErrors: Array<{ metric: string; errors: string[] }> = [];

  const results = await Promise.allSettled(
    publishers.map(async (publisher) => {
      const published = await publisher.publish(context);
      return { publisher, published };
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      const name =
        result.reason instanceof Error
          ? result.reason.message.slice(0, 80)
          : "unknown publisher";
      publisherHealth.push({
        name,
        status: "DEGRADED",
        observationCount: 0,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      trackCcosEvent("ccos_publisher_failed");
      continue;
    }

    const { publisher, published } = result.value;
    const { recorded, errors } = recordObservations(published);
    observations.push(...recorded);
    recordErrors.push(...errors);
    publisherHealth.push({
      name: publisher.name,
      status: errors.length > 0 ? "DEGRADED" : "OK",
      observationCount: recorded.length,
      error: errors.length > 0 ? `${errors.length} invalid observation(s)` : undefined,
    });
  }

  return { observations, publisherHealth, recordErrors };
}

export async function collectObservations(
  context: PublisherContext,
): Promise<{
  observations: UniversalObservation[];
  publisherHealth: PublisherHealth[];
}> {
  const result = await runPublishers(context);
  return {
    observations: result.observations,
    publisherHealth: result.publisherHealth,
  };
}
