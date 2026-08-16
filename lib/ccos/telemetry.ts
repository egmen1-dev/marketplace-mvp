const counters = new Map<string, number>();

export function trackCcosEvent(event: string): void {
  counters.set(event, (counters.get(event) ?? 0) + 1);
}

export function getCcosTelemetryCounters(): Record<string, number> {
  return Object.fromEntries(counters);
}

export function resetCcosTelemetry(): void {
  counters.clear();
}
