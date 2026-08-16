import type { BrainSnapshot, KnowledgeFact, KnowledgePackId, KnowledgeSnapshot } from "./types";
import { exportKnowledgePack } from "./packs";
import { KNOWLEDGE_PACK_VERSION } from "./versions";

const brainSnapshots = new Map<string, BrainSnapshot>();

export function buildKnowledgeSnapshot(packs: KnowledgePackId[] = ["marketplace"]): KnowledgeSnapshot {
  const facts: KnowledgeFact[] = [];
  for (const pack of packs) {
    facts.push(...exportKnowledgePack(pack).facts);
  }
  return {
    syncVersion: KNOWLEDGE_PACK_VERSION,
    offlineTimestamp: new Date().toISOString(),
    packs,
    verifiedFactIds: facts.map((f) => f.id),
    facts,
  };
}

export function saveBrainSnapshot(snapshot: BrainSnapshot): BrainSnapshot {
  brainSnapshots.set(`${snapshot.productId}:${snapshot.syncVersion}`, snapshot);
  return snapshot;
}

export function getBrainSnapshot(productId: string, syncVersion?: string): BrainSnapshot | null {
  if (syncVersion) {
    return brainSnapshots.get(`${productId}:${syncVersion}`) ?? null;
  }
  const matches = [...brainSnapshots.values()].filter((s) => s.productId === productId);
  return matches.sort((a, b) => b.offlineTimestamp.localeCompare(a.offlineTimestamp))[0] ?? null;
}

export function resetBrainSnapshots(): void {
  brainSnapshots.clear();
}

export function buildBrainSnapshotPayload(input: {
  productId: string;
  brainVersion: string;
  contextFingerprint: string;
  payload: Record<string, unknown>;
}): BrainSnapshot {
  return {
    productId: input.productId,
    brainVersion: input.brainVersion,
    syncVersion: `${input.brainVersion}:${input.contextFingerprint}`,
    offlineTimestamp: new Date().toISOString(),
    contextFingerprint: input.contextFingerprint,
    payload: input.payload,
  };
}
