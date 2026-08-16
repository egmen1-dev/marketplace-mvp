import { KNOWLEDGE_GRAPH_CONTRACT_VERSION } from "@/lib/ccos/graph/types";
import { snapshotGraphVersion, listGraphVersions, getActiveGraphVersion } from "@/lib/ccos/graph/versioning";

import type { VerifiedVersionRecord } from "./types";

const verifiedGraphVersions = new Map<string, VerifiedVersionRecord>();
const verifiedBrainVersions = new Map<string, VerifiedVersionRecord>();
const verifiedKnowledgeVersions = new Map<string, VerifiedVersionRecord>();

let bootstrapComplete = false;

function seedGraphVersionsIfNeeded(): void {
  if (bootstrapComplete) return;
  if (listGraphVersions().length >= 2) {
    bootstrapComplete = true;
    for (const snap of listGraphVersions()) {
      registerVerifiedGraphVersion(snap.version, snap.createdAt);
    }
    return;
  }

  const baseNode = {
    id: "product.photo",
    label: "Photo quality",
    kind: "photo" as const,
    app: "marketplace" as const,
    confidence: 0.5,
  };
  const baseEdge = {
    id: "edge-photo-ctr",
    from: "product.photo",
    to: "metric.ctr",
    relation: "causes" as const,
    weight: 0.4,
    causal: true,
    confidence: 0.48,
    version: "graph-engine-v1.1",
    app: "marketplace" as const,
    sources: ["wave4-seed"],
    verified: true,
  };

  snapshotGraphVersion({
    version: "graph-engine-v1.1",
    nodes: [baseNode],
    edges: [baseEdge],
  });
  snapshotGraphVersion({
    version: "graph-engine-v1.2",
    nodes: [
      baseNode,
      { id: "metric.ctr", label: "CTR", kind: "ctr" as const, app: "marketplace" as const, confidence: 0.45 },
    ],
    edges: [{ ...baseEdge, version: "graph-engine-v1.2" }],
  });

  registerVerifiedGraphVersion("graph-engine-v1.1", new Date(Date.now() - 86400000).toISOString());
  registerVerifiedGraphVersion("graph-engine-v1.2", new Date().toISOString());
  bootstrapComplete = true;
}

export function registerVerifiedGraphVersion(version: string, acceptedAt: string): VerifiedVersionRecord {
  seedGraphVersionsIfNeeded();
  const record: VerifiedVersionRecord = {
    version,
    artifactType: "graph_version",
    provenance: {
      source: "ccos-graph-engine",
      module: "graph/versioning",
      contractVersion: KNOWLEDGE_GRAPH_CONTRACT_VERSION,
      acceptedBy: "wave4-staging",
    },
    acceptedAt,
    status: "ACCEPTED",
  };
  verifiedGraphVersions.set(version, record);
  return record;
}

export function registerVerifiedBrainVersion(version: string, acceptedAt: string): VerifiedVersionRecord {
  const record: VerifiedVersionRecord = {
    version,
    artifactType: "brain_version",
    provenance: {
      source: "ccos-knowledge",
      module: "knowledge/versions",
      contractVersion: "brain-version-v1",
      acceptedBy: "wave-staging",
    },
    acceptedAt,
    status: "ACCEPTED",
  };
  verifiedBrainVersions.set(version, record);
  return record;
}

export function registerVerifiedKnowledgeVersion(version: string, acceptedAt: string): VerifiedVersionRecord {
  const record: VerifiedVersionRecord = {
    version,
    artifactType: "knowledge_version",
    provenance: {
      source: "ccos-knowledge",
      module: "knowledge/packs",
      contractVersion: "knowledge-pack-v1",
      acceptedBy: "wave2-staging",
    },
    acceptedAt,
    status: "ACCEPTED",
  };
  verifiedKnowledgeVersions.set(version, record);
  return record;
}

export function bootstrapVerifiedVersions(): void {
  seedGraphVersionsIfNeeded();

  const brainVersions = [
    "marketplace-brain-v1",
    "marketplace-brain-v2-knowledge",
    "marketplace-brain-v3-product",
    "marketplace-brain-v4-graph",
    "marketplace-brain-v5-twin",
  ];
  brainVersions.forEach((v, i) => {
    registerVerifiedBrainVersion(v, new Date(Date.now() - (brainVersions.length - i) * 3600000).toISOString());
  });

  registerVerifiedKnowledgeVersion("knowledge-pack-v1", "2026-08-16T00:00:00.000Z");
  registerVerifiedKnowledgeVersion("knowledge-pack-v2", new Date().toISOString());
}

export function getVerifiedGraphVersion(version: string): VerifiedVersionRecord | null {
  seedGraphVersionsIfNeeded();
  return verifiedGraphVersions.get(version) ?? null;
}

export function getVerifiedBrainVersion(version: string): VerifiedVersionRecord | null {
  return verifiedBrainVersions.get(version) ?? null;
}

export function getVerifiedKnowledgeVersion(version: string): VerifiedVersionRecord | null {
  return verifiedKnowledgeVersions.get(version) ?? null;
}

export function listVerifiedGraphVersions(): VerifiedVersionRecord[] {
  seedGraphVersionsIfNeeded();
  return [...verifiedGraphVersions.values()];
}

export function resetVerifiedVersionRegistry(): void {
  verifiedGraphVersions.clear();
  verifiedBrainVersions.clear();
  verifiedKnowledgeVersions.clear();
  bootstrapComplete = false;
}

export function ensureRollbackBootstrap(): void {
  bootstrapVerifiedVersions();
  void getActiveGraphVersion();
}
