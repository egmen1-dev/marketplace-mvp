import type { BrainVersionRegistryEntry } from "./types";

export const KNOWLEDGE_PACK_VERSION = "knowledge-pack-v2";
export const KNOWLEDGE_PACK_PREVIOUS = "knowledge-pack-v1";
export const REASONING_PACK_VERSION = "reasoning-pack-v1";
export const EXPERIMENT_REGISTRY_VERSION = "experiment-registry-v1";
export const KNOWLEDGE_REPOSITORY_VERSION = "knowledge-repository-v1";

const REGISTRY: BrainVersionRegistryEntry[] = [
  {
    brainVersion: "marketplace-brain-v1",
    knowledgePackVersion: KNOWLEDGE_PACK_VERSION,
    reasoningPackVersion: REASONING_PACK_VERSION,
    experimentVersion: EXPERIMENT_REGISTRY_VERSION,
    releasedAt: "2026-08-16T00:00:00.000Z",
    notes: "Wave 1 advisory brain baseline",
  },
  {
    brainVersion: "marketplace-brain-v2-knowledge",
    knowledgePackVersion: "knowledge-pack-v2",
    reasoningPackVersion: "reasoning-pack-v2",
    experimentVersion: EXPERIMENT_REGISTRY_VERSION,
    releasedAt: "2026-08-16T12:00:00.000Z",
    notes: "Wave 2 Knowledge & Experiment Platform",
  },
  {
    brainVersion: "marketplace-brain-v3-product",
    knowledgePackVersion: "knowledge-pack-v2",
    reasoningPackVersion: "reasoning-pack-v3-product",
    experimentVersion: "experiment-registry-v1",
    releasedAt: new Date().toISOString(),
    notes: "Wave 3 Product Understanding integration",
  },
  {
    brainVersion: "marketplace-brain-v4-graph",
    knowledgePackVersion: "knowledge-pack-v2",
    reasoningPackVersion: "reasoning-pack-v4-graph",
    experimentVersion: "experiment-registry-v1",
    releasedAt: new Date().toISOString(),
    notes: "Wave 4 Cognitive Knowledge Graph Platform",
  },
  {
    brainVersion: "marketplace-brain-v5-twin",
    knowledgePackVersion: "knowledge-pack-v2",
    reasoningPackVersion: "reasoning-pack-v5-twin",
    experimentVersion: "experiment-registry-v1",
    releasedAt: new Date().toISOString(),
    notes: "Wave 5 Digital Twin & Decision Simulation",
  },
];

export function getBrainVersionRegistry(): BrainVersionRegistryEntry[] {
  return [...REGISTRY];
}

export function resolveBrainVersionEntry(brainVersion: string): BrainVersionRegistryEntry {
  return (
    REGISTRY.find((r) => r.brainVersion === brainVersion) ??
    REGISTRY[REGISTRY.length - 1]
  );
}

export function currentMarketplaceBrainVersion(): string {
  if (process.env.CCOS_TWIN_PLATFORM_ENABLED === "true") {
    return "marketplace-brain-v5-twin";
  }
  if (process.env.CCOS_GRAPH_PLATFORM_ENABLED === "true") {
    return "marketplace-brain-v4-graph";
  }
  if (process.env.CCOS_PRODUCT_PLATFORM_ENABLED === "true") {
    return "marketplace-brain-v3-product";
  }
  return "marketplace-brain-v2-knowledge";
}
