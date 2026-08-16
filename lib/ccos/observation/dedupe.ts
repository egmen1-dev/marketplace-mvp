import { observationDeduplicationKey } from "./normalize";

const recentKeys = new Map<string, number>();
const DEDUPE_TTL_MS = 60_000;
const MAX_KEYS = 10_000;

export function resetObservationDedupeCache(): void {
  recentKeys.clear();
}

export function isDuplicateObservation(key: string, now = Date.now()): boolean {
  prune(now);
  return recentKeys.has(key);
}

export function markObservationRecorded(key: string, now = Date.now()): void {
  prune(now);
  recentKeys.set(key, now);
}

function prune(now: number): void {
  if (recentKeys.size > MAX_KEYS) {
    recentKeys.clear();
    return;
  }
  for (const [key, ts] of recentKeys) {
    if (now - ts > DEDUPE_TTL_MS) recentKeys.delete(key);
  }
}

export { observationDeduplicationKey };
