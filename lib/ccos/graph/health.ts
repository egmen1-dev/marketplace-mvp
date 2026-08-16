import type { GraphEdge, GraphHealth, GraphNode } from "./types";

function countConnectedComponents(nodes: GraphNode[], edges: GraphEdge[]): number {
  const ids = new Set(nodes.map((n) => n.id));
  const adj = new Map<string, Set<string>>();
  for (const id of ids) adj.set(id, new Set());
  for (const e of edges) {
    if (!adj.has(e.from) || !adj.has(e.to)) continue;
    adj.get(e.from)!.add(e.to);
    adj.get(e.to)!.add(e.from);
  }

  const visited = new Set<string>();
  let components = 0;

  for (const id of ids) {
    if (visited.has(id)) continue;
    components += 1;
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const next of adj.get(cur) ?? []) stack.push(next);
    }
  }
  return components;
}

export function computeGraphHealth(
  nodes: GraphNode[],
  edges: GraphEdge[],
  coverage: number,
): GraphHealth {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const density = nodeCount <= 1 ? 0 : edgeCount / (nodeCount * (nodeCount - 1));
  const averageConfidence =
    nodeCount === 0 ? 0 : nodes.reduce((s, n) => s + n.confidence, 0) / nodeCount;
  const connectedComponents = countConnectedComponents(nodes, edges);

  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.from);
    connectedIds.add(e.to);
  }
  const orphanNodeCount = nodes.filter((n) => !connectedIds.has(n.id)).length;
  const lowConfidenceEdgeCount = edges.filter((e) => e.confidence < 0.45).length;

  const label =
    coverage >= 0.65 && density >= 0.08 ? "strong" : coverage >= 0.35 ? "moderate" : "sparse";

  return {
    coverage,
    density: Math.round(density * 1000) / 1000,
    connectedComponents,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    nodeCount,
    edgeCount,
    orphanNodeCount,
    lowConfidenceEdgeCount,
    label,
  };
}

export function detectOrphanNodes(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.from);
    connectedIds.add(e.to);
  }
  return nodes.filter((n) => !connectedIds.has(n.id));
}
