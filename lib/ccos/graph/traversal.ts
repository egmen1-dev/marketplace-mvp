import type { GraphWhyPath } from "./types";
import { rankCausesByWeight } from "./causal";
import { UniversalGraphEngine } from "./engine";

export const MAX_REASONING_PATH_DEPTH = 12;

const DEFAULT_SALES_PATH = [
  "node_photo",
  "node_ctr",
  "node_conversion",
  "node_revenue",
];

function edgeEvidenceStep(
  engine: UniversalGraphEngine,
  fromId: string,
  toId: string,
): Pick<GraphWhyPath["path"][number], "evidence" | "source" | "confidence" | "weight"> {
  const edge = engine
    .outgoing(fromId)
    .concat(engine.incoming(toId))
    .find((e) => e.from === fromId && e.to === toId);

  if (!edge) return {};

  return {
    weight: edge.weight,
    confidence: edge.confidence,
    source: edge.sources?.[0] ?? edge.app ?? "marketplace",
    evidence: `${edge.relation} (${edge.causal ? "causal" : "correlated"}) w=${edge.weight.toFixed(2)}`,
  };
}

export function findWhyPath(
  engine: UniversalGraphEngine,
  input: {
    question: string;
    targetNodeId?: string;
    weakNodeIds?: string[];
    maxDepth?: number;
  },
): GraphWhyPath {
  const maxDepth = input.maxDepth ?? MAX_REASONING_PATH_DEPTH;
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
            ...edgeEvidenceStep(engine, edge.from, edge.to),
          });
        }
      }
    }
  }

  if (path.length === 0) {
    for (let i = 0; i < DEFAULT_SALES_PATH.length; i += 1) {
      const nodeId = DEFAULT_SALES_PATH[i];
      const node = engine.getNode(nodeId);
      if (!node) continue;
      const prevId = i > 0 ? DEFAULT_SALES_PATH[i - 1] : null;
      path.push({
        nodeId: node.id,
        label: node.label,
        kind: node.kind,
        ...(prevId ? edgeEvidenceStep(engine, prevId, nodeId) : {}),
      });
    }
  }

  const trimmed = path.slice(0, maxDepth);
  const root = trimmed[0];
  const avgConf =
    trimmed.reduce((sum, p) => sum + (p.confidence ?? engine.getNode(p.nodeId)?.confidence ?? 0.5), 0) /
    Math.max(1, trimmed.length);

  return {
    question: input.question,
    rootCauseId: root?.nodeId ?? "node_photo",
    path: trimmed,
    confidence: Math.min(1, avgConf),
    explanation: trimmed.map((p) => p.label).join(" → "),
  };
}

export function findPathToOutcome(
  engine: UniversalGraphEngine,
  outcomeId: string,
  maxDepth = MAX_REASONING_PATH_DEPTH,
): GraphWhyPath["path"] {
  const path: GraphWhyPath["path"] = [];
  let current = outcomeId;
  const visited = new Set<string>();

  while (current && !visited.has(current) && path.length < maxDepth) {
    visited.add(current);
    const node = engine.getNode(current);
    if (node) path.unshift({ nodeId: node.id, label: node.label, kind: node.kind });
    const causes = rankCausesByWeight(engine.incoming(current, true));
    const next = causes[0]?.from ?? "";
    if (next && visited.has(next)) break;
    current = next;
  }

  return path;
}

export function traverseGraphSafely(
  engine: UniversalGraphEngine,
  startId: string,
  visit: (nodeId: string, depth: number) => boolean | void,
  maxDepth = MAX_REASONING_PATH_DEPTH,
): number {
  const visited = new Set<string>();
  const stack: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
  let steps = 0;

  while (stack.length) {
    const { id, depth } = stack.pop()!;
    if (depth > maxDepth || visited.has(id)) continue;
    visited.add(id);
    steps += 1;
    const stop = visit(id, depth);
    if (stop) break;

    for (const edge of engine.outgoing(id)) {
      if (!visited.has(edge.to)) stack.push({ id: edge.to, depth: depth + 1 });
    }
  }

  return steps;
}
