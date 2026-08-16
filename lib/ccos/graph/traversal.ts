import type { GraphWhyPath } from "./types";
import { rankCausesByWeight } from "./causal";
import { UniversalGraphEngine } from "./engine";

const DEFAULT_SALES_PATH = [
  "node_photo",
  "node_ctr",
  "node_conversion",
  "node_review",
  "node_trust",
  "node_revenue",
];

export function findWhyPath(
  engine: UniversalGraphEngine,
  input: {
    question: string;
    targetNodeId?: string;
    weakNodeIds?: string[];
  },
): GraphWhyPath {
  const target = input.targetNodeId ?? "node_revenue";
  const path: GraphWhyPath["path"] = [];

  if (input.weakNodeIds?.length) {
    const weakId = input.weakNodeIds[0];
    const node = engine.getNode(weakId);
    if (node) {
      path.push({ nodeId: node.id, label: node.label, kind: node.kind });
      const effects = rankCausesByWeight(engine.outgoing(weakId, true));
      for (const edge of effects.slice(0, 2)) {
        const next = engine.getNode(edge.to);
        if (next) {
          path.push({
            nodeId: next.id,
            label: next.label,
            kind: next.kind,
            weight: edge.weight,
          });
        }
      }
    }
  }

  if (path.length === 0) {
    for (const nodeId of DEFAULT_SALES_PATH) {
      const node = engine.getNode(nodeId);
      if (node) path.push({ nodeId: node.id, label: node.label, kind: node.kind });
    }
  }

  const root = path[0];
  const avgConf =
    path.reduce((sum, p) => sum + (engine.getNode(p.nodeId)?.confidence ?? 0.5), 0) /
    Math.max(1, path.length);

  return {
    question: input.question,
    rootCauseId: root?.nodeId ?? "node_photo",
    path,
    confidence: Math.min(1, avgConf),
    explanation: path.map((p) => p.label).join(" → "),
  };
}

export function findPathToOutcome(
  engine: UniversalGraphEngine,
  outcomeId: string,
): GraphWhyPath["path"] {
  const path: GraphWhyPath["path"] = [];
  let current = outcomeId;
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    visited.add(current);
    const node = engine.getNode(current);
    if (node) path.unshift({ nodeId: node.id, label: node.label, kind: node.kind });
    const causes = rankCausesByWeight(engine.incoming(current, true));
    current = causes[0]?.from ?? "";
    if (path.length > 8) break;
  }

  return path;
}
