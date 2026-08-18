/**
 * EPIC 92 — Cache / offline policy value objects (ADR-006, ADR-007).
 */

export type CacheTier = "memory" | "secure" | "snapshot";

export type CachePolicy = {
  readonly tier: CacheTier;
  readonly ttlMs: number;
  readonly staleWhileRevalidate: boolean;
};

export type OfflinePolicy = "cache-first" | "network-only" | "queue-mutation" | "local-only";

export type RetryPolicy = {
  readonly maxAttempts: number;
  readonly backoffMs: number;
  readonly retryableCodes: ReadonlyArray<"network" | "server" | "timeout">;
};

export type StateOwnershipContract = {
  readonly domain: string;
  readonly entity: string;
  readonly owner: "repository" | "session-store" | "connectivity-store" | "cache-repository";
  readonly persistence: CacheTier | "none";
  readonly ttlMs: number | null;
  readonly offlinePolicy: OfflinePolicy;
  readonly recovery: string;
};
