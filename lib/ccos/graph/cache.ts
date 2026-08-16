import type { CausalKnowledgeGraph, GraphCacheEntry, MobileGraphInsights } from "./types";

const cache = new Map<string, GraphCacheEntry>();

export function cacheGraphInsights(entry: GraphCacheEntry): GraphCacheEntry {
  cache.set(entry.productId, entry);
  return entry;
}

export function getCachedGraphInsights(productId: string): GraphCacheEntry | null {
  return cache.get(productId) ?? null;
}

export function listCachedGraphProducts(): string[] {
  return [...cache.keys()];
}

export function resetGraphCache(): void {
  cache.clear();
}

export function buildGraphCacheEntry(input: {
  productId: string;
  graph: CausalKnowledgeGraph;
  insights: MobileGraphInsights;
}): GraphCacheEntry {
  return {
    productId: input.productId,
    graph: input.graph,
    insights: input.insights,
    cachedAt: new Date().toISOString(),
    syncVersion: `${input.graph.version}:${input.graph.propagatedConfidence.toFixed(2)}`,
  };
}
