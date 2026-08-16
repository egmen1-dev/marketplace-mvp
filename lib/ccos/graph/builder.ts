import type { ProductUnderstanding } from "@/lib/ccos/product";
import type { KnowledgeFact } from "@/lib/ccos/knowledge/types";
import type { CausalGraphEdge, CausalGraphNode, CausalKnowledgeGraph } from "./types";
import { KNOWLEDGE_GRAPH_CONTRACT_VERSION } from "./types";

export function buildCausalKnowledgeGraph(input: {
  productUnderstanding?: ProductUnderstanding | null;
  verifiedFacts?: KnowledgeFact[];
}): CausalKnowledgeGraph {
  const nodes: CausalGraphNode[] = [];
  const edges: CausalGraphEdge[] = [];

  if (input.productUnderstanding) {
    for (const node of input.productUnderstanding.needGraph.nodes) {
      nodes.push({
        id: `need_${node.id}`,
        label: node.label,
        type: node.type === "product" ? "product" : node.type === "need" ? "need" : "factor",
        confidence: input.productUnderstanding.identity.confidence,
      });
    }
    for (const edge of input.productUnderstanding.needGraph.edges) {
      edges.push({
        from: `need_${edge.from}`,
        to: `need_${edge.to}`,
        relation: edge.relation === "causes" ? "causes" : "influences",
        weight: 0.7,
      });
    }
    nodes.push(
      { id: "factor_photo", label: "Качество фото", type: "factor", confidence: 0.75 },
      { id: "outcome_ctr", label: "CTR", type: "outcome", confidence: 0.7 },
      { id: "outcome_conversion", label: "Конверсия", type: "outcome", confidence: 0.65 },
    );
    edges.push(
      { from: "factor_photo", to: "outcome_ctr", relation: "influences", weight: 0.8 },
      { from: "outcome_ctr", to: "outcome_conversion", relation: "causes", weight: 0.6 },
    );
  }

  for (const fact of input.verifiedFacts ?? []) {
    nodes.push({
      id: `fact_${fact.id}`,
      label: fact.title,
      type: "factor",
      confidence: fact.confidence,
    });
    edges.push({
      from: `fact_${fact.id}`,
      to: "outcome_ctr",
      relation: "correlates",
      weight: fact.confidence * 0.5,
      evidenceIds: fact.evidenceIds,
    });
  }

  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const coverage =
    nodeCount === 0
      ? 0
      : Math.min(1, edgeCount / Math.max(4, nodeCount) + (input.verifiedFacts?.length ? 0.15 : 0));

  return {
    contractVersion: KNOWLEDGE_GRAPH_CONTRACT_VERSION,
    nodes,
    edges,
    coverage,
    nodeCount,
    edgeCount,
  };
}
