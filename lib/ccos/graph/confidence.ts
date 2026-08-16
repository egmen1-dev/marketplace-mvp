import type { GraphEdge, GraphNode } from "./types";

export function propagateGraphConfidence(nodes: GraphNode[], edges: GraphEdge[]): number {
  if (nodes.length === 0) return 0;

  const nodeConf = new Map(nodes.map((n) => [n.id, n.confidence]));
  let sum = 0;
  let count = 0;

  for (const edge of edges) {
    const from = nodeConf.get(edge.from) ?? 0.5;
    const to = nodeConf.get(edge.to) ?? 0.5;
    const propagated = Math.min(from, to) * edge.weight;
    sum += propagated;
    count += 1;
  }

  const nodeAvg = nodes.reduce((a, n) => a + n.confidence, 0) / nodes.length;
  const edgeAvg = count > 0 ? sum / count : nodeAvg;

  return Math.min(1, nodeAvg * 0.55 + edgeAvg * 0.45);
}

export function capRecommendationConfidence(
  graphConfidence: number,
  rawConfidence: number,
): number {
  const cap = Math.max(0.25, graphConfidence * 1.05);
  return Math.min(rawConfidence, cap);
}

export function confidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}
