import type { GraphEdge, GraphNode } from "./types";
import { UniversalGraphEngine } from "./engine";

export function getCauses(engine: UniversalGraphEngine, nodeId: string): GraphEdge[] {
  return engine.incoming(nodeId, true);
}

export function getEffects(engine: UniversalGraphEngine, nodeId: string): GraphEdge[] {
  return engine.outgoing(nodeId, true);
}

export function explainCausalLink(edge: GraphEdge, fromNode?: GraphNode, toNode?: GraphNode): string {
  const from = fromNode?.label ?? edge.from;
  const to = toNode?.label ?? edge.to;
  if (edge.relation === "causes") {
    return `${from} вызывает ${to} (вес ${edge.weight.toFixed(2)})`;
  }
  if (edge.relation === "blocks") {
    return `${from} блокирует ${to}`;
  }
  return `${from} влияет на ${to} (вес ${edge.weight.toFixed(2)})`;
}

export function rankCausesByWeight(edges: GraphEdge[]): GraphEdge[] {
  return [...edges].sort((a, b) => b.weight - a.weight);
}

export function isCausalRelation(edge: GraphEdge): boolean {
  return edge.causal || edge.relation === "causes";
}
