import type { GraphVersionSnapshot } from "./types";
import { GRAPH_ENGINE_VERSION, KNOWLEDGE_GRAPH_CONTRACT_VERSION } from "./types";

const versions: GraphVersionSnapshot[] = [];

export function snapshotGraphVersion(input: {
  version: string;
  nodes: GraphVersionSnapshot["nodes"];
  edges: GraphVersionSnapshot["edges"];
}): GraphVersionSnapshot {
  const snap: GraphVersionSnapshot = {
    version: input.version,
    contractVersion: KNOWLEDGE_GRAPH_CONTRACT_VERSION,
    createdAt: new Date().toISOString(),
    nodeCount: input.nodes.length,
    edgeCount: input.edges.length,
    nodes: input.nodes,
    edges: input.edges,
  };
  versions.push(snap);
  return snap;
}

export function listGraphVersions(): GraphVersionSnapshot[] {
  return [...versions];
}

export function rollbackGraphVersion(version: string): GraphVersionSnapshot | null {
  const snap = versions.find((v) => v.version === version);
  return snap ?? null;
}

export function nextGraphVersionLabel(): string {
  return `${GRAPH_ENGINE_VERSION}.${versions.length + 1}`;
}

export function resetGraphVersions(): void {
  versions.length = 0;
}
