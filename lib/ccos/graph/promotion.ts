import type { KnowledgeFact } from "@/lib/ccos/knowledge/types";
import type { GraphEdge, GraphNode } from "./types";
import { GRAPH_ENGINE_VERSION } from "./types";
import { getGraphEngine } from "./engine";

export function promoteFactToGraph(
  fact: KnowledgeFact,
  options?: { verified?: boolean },
): { node: GraphNode; edge?: GraphEdge } {
  const verified = options?.verified ?? fact.status === "verified";
  const engine = getGraphEngine();
  const node: GraphNode = {
    id: `fact_${fact.id}`,
    label: fact.title,
    kind: "factor",
    confidence: fact.confidence,
    factId: fact.id,
    evidenceIds: fact.evidenceIds,
    app: "marketplace",
  };
  engine.addNode(node);

  const baseEdge = {
    confidence: fact.confidence,
    version: GRAPH_ENGINE_VERSION,
    app: "marketplace" as const,
    verified,
    sources: fact.sources.map((s) => `${s.system}/${s.module}`),
    evidenceIds: fact.evidenceIds,
  };

  let edge: GraphEdge | undefined;
  if (fact.title.toLowerCase().includes("фото") || fact.title.toLowerCase().includes("photo")) {
    edge = {
      id: `promo_${fact.id}_photo_ctr`,
      from: node.id,
      to: "node_photo",
      relation: "influences",
      weight: fact.confidence * 0.6,
      causal: verified,
      ...baseEdge,
    };
    engine.addEdge(edge);
  } else if (fact.title.toLowerCase().includes("ctr")) {
    edge = {
      id: `promo_${fact.id}_ctr`,
      from: node.id,
      to: "node_ctr",
      relation: verified ? "causes" : "correlates",
      weight: fact.confidence * 0.5,
      causal: verified,
      ...baseEdge,
    };
    engine.addEdge(edge);
  } else {
    edge = {
      id: `promo_${fact.id}_conversion`,
      from: node.id,
      to: "node_conversion",
      relation: "correlates",
      weight: fact.confidence * 0.4,
      causal: false,
      ...baseEdge,
    };
    engine.addEdge(edge);
  }

  return { node, edge };
}

export function assertGraphPromotionPipeline(): {
  observation: string;
  evidence: string;
  candidate: string;
  graph: string;
  verified: string;
} {
  return {
    observation: "Observation",
    evidence: "Evidence",
    candidate: "Candidate Knowledge",
    graph: "Graph node/edge",
    verified: "Verified Knowledge",
  };
}
