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

export type GraphVersionDiff = {
  addedNodes: string[];
  removedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
  changedEdges: Array<{ id: string; before: GraphVersionSnapshot["edges"][number]; after: GraphVersionSnapshot["edges"][number] }>;
};

export function diffGraphVersions(
  fromVersion: string,
  toVersion: string,
): GraphVersionDiff | null {
  const from = versions.find((v) => v.version === fromVersion);
  const to = versions.find((v) => v.version === toVersion);
  if (!from || !to) return null;

  const fromNodeIds = new Set(from.nodes.map((n) => n.id));
  const toNodeIds = new Set(to.nodes.map((n) => n.id));
  const fromEdgeIds = new Map(from.edges.map((e) => [e.id, e]));
  const toEdgeIds = new Map(to.edges.map((e) => [e.id, e]));

  const addedNodes = [...toNodeIds].filter((id) => !fromNodeIds.has(id));
  const removedNodes = [...fromNodeIds].filter((id) => !toNodeIds.has(id));
  const addedEdges = [...toEdgeIds.keys()].filter((id) => !fromEdgeIds.has(id));
  const removedEdges = [...fromEdgeIds.keys()].filter((id) => !toEdgeIds.has(id));
  const changedEdges: GraphVersionDiff["changedEdges"] = [];

  for (const [id, after] of toEdgeIds) {
    const before = fromEdgeIds.get(id);
    if (!before) continue;
    if (before.weight !== after.weight || before.confidence !== after.confidence || before.relation !== after.relation) {
      changedEdges.push({ id, before, after });
    }
  }

  return { addedNodes, removedNodes, addedEdges, removedEdges, changedEdges };
}

export function nextGraphVersionLabel(): string {
  return `${GRAPH_ENGINE_VERSION}.${versions.length + 1}`;
}

export function resetGraphVersions(): void {
  versions.length = 0;
}
