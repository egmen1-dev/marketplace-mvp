import type { TwinSimulationCacheEntry, TwinDecisionReport, TwinAppId } from "./types";

const cache = new Map<string, TwinSimulationCacheEntry>();

function cacheKey(productId: string, app: TwinAppId): string {
  return `${app}:${productId}`;
}

export function cacheTwinSimulation(input: {
  productId: string;
  app: TwinAppId;
  report: TwinDecisionReport;
  pendingSync?: boolean;
}): TwinSimulationCacheEntry {
  const entry: TwinSimulationCacheEntry = {
    id: `twin_cache_${Date.now()}`,
    productId: input.productId,
    app: input.app,
    report: input.report,
    cachedAt: new Date().toISOString(),
    syncVersion: `${input.report.computedAt}:${input.report.scenarioCount}`,
    pendingSync: input.pendingSync ?? false,
  };
  cache.set(cacheKey(input.productId, input.app), entry);
  return entry;
}

export function getCachedTwinSimulation(
  productId: string,
  app: TwinAppId = "marketplace",
): TwinSimulationCacheEntry | null {
  return cache.get(cacheKey(productId, app)) ?? null;
}

export function listPendingTwinCacheSync(): TwinSimulationCacheEntry[] {
  return [...cache.values()].filter((e) => e.pendingSync);
}

export function markTwinCacheSynced(productId: string, app: TwinAppId = "marketplace"): void {
  const entry = cache.get(cacheKey(productId, app));
  if (entry) entry.pendingSync = false;
}

export function resetTwinSimulationCache(): void {
  cache.clear();
}
