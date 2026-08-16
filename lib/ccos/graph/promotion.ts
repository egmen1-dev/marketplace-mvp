import type { KnowledgeFact } from "@/lib/ccos/knowledge/types";
import type { GraphEdge, GraphNode } from "./types";
import { getGraphEngine } from "./engine";

export function promoteFactToGraph(fact: KnowledgeFact): { node: GraphNode; edge?: GraphEdge } {
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

  let edge: GraphEdge | undefined;
  if (fact.title.toLowerCase().includes("фото") || fact.title.toLowerCase().includes("photo")) {
    edge = {
      id: `promo_${fact.id}_photo_ctr`,
      from: node.id,
      to: "node_photo",
      relation: "influences",
      weight: fact.confidence * 0.6,
      causal: true,
      evidenceIds: fact.evidenceIds,
    };
    engine.addEdge(edge);
  } else if (fact.title.toLowerCase().includes("ctr")) {
    edge = {
      id: `promo_${fact.id}_ctr`,
      from: node.id,
      to: "node_ctr",
      relation: "causes",
      weight: fact.confidence * 0.5,
      causal: true,
      evidenceIds: fact.evidenceIds,
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
      evidenceIds: fact.evidenceIds,
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
