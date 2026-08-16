import type { ProductUnderstanding } from "@/lib/ccos/product";
import type { KnowledgeFact } from "@/lib/ccos/knowledge/types";
import type { UniversalObservation } from "@/lib/ccos/observation/types";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";

import { propagateGraphConfidence } from "./confidence";
import {
  CORE_CAUSAL_CHAIN,
  PRICE_CHAIN,
  TRUST_CHAIN,
  coreGraphNodes,
  materializeEdges,
} from "./edges";
import { getGraphEngine, resetGraphEngine } from "./engine";
import { computeGraphHealth } from "./health";
import { promoteFactToGraph } from "./promotion";
import { getPackSubgraph, resolveGraphPackId } from "./packs";
import { crossAppGraphExtensions } from "./cross-app";
import { snapshotGraphVersion, nextGraphVersionLabel } from "./versioning";
import type { BuildKnowledgeGraphInput, CausalKnowledgeGraph, GraphNode } from "./types";
import {
  GRAPH_ENGINE_VERSION,
  KNOWLEDGE_GRAPH_CONTRACT_VERSION,
} from "./types";

function weakFactorNodes(input: BuildKnowledgeGraphInput): string[] {
  const weak: string[] = [];
  for (const signal of input.weakSignals ?? []) {
    if (signal.score == null || signal.score >= 60) continue;
    const m = signal.metric.toLowerCase();
    if (m.includes("photo") || m.includes("visual")) weak.push("node_photo");
    else if (m.includes("price")) weak.push("node_price");
    else if (m.includes("trust")) weak.push("node_trust");
    else if (m.includes("seo")) weak.push("node_seo");
    else if (m.includes("ctr") || m.includes("behaviour")) weak.push("node_ctr");
  }
  return [...new Set(weak)];
}

export function buildKnowledgeGraph(input: BuildKnowledgeGraphInput): CausalKnowledgeGraph {
  resetGraphEngine();
  const engine = getGraphEngine();

  for (const node of coreGraphNodes()) engine.addNode(node);
  for (const edge of materializeEdges([...CORE_CAUSAL_CHAIN, ...TRUST_CHAIN, ...PRICE_CHAIN])) {
    engine.addEdge(edge);
  }

  const packId =
    input.packId ??
    resolveGraphPackId({
      categorySlug: input.categorySlug ?? input.productUnderstanding?.identity.category,
      productType: input.productUnderstanding?.identity.productType,
    });
  const pack = getPackSubgraph(packId);
  for (const node of pack.nodes) engine.addNode(node);
  for (const edge of pack.edges) engine.addEdge(edge);

  for (const app of ["marketplace", "daos", "quicksale"] as const) {
    const ext = crossAppGraphExtensions(app);
    for (const node of ext.nodes) engine.addNode(node);
    for (const edge of ext.edges) engine.addEdge(edge);
  }

  if (input.productUnderstanding) {
    engine.addNode({
      id: `product_${input.productId ?? "unknown"}`,
      label: input.productUnderstanding.identity.productType ?? "Product",
      kind: "product",
      confidence: input.productUnderstanding.identity.confidence,
      packId,
    });
    for (const need of input.productUnderstanding.needGraph.nodes) {
      engine.addNode({
        id: `need_${need.id}`,
        label: need.label,
        kind: need.type === "need" ? "need" : "factor",
        confidence: input.productUnderstanding.identity.confidence,
        packId,
      });
    }
  }

  for (const fact of input.verifiedFacts ?? []) {
    promoteFactToGraph(fact);
  }

  for (const obs of input.observations ?? []) {
    if (obs.metric === OBSERVATION_METRICS.visual.photoQuality) {
      const node = engine.getNode("node_photo");
      if (node && obs.normalizedScore != null && obs.normalizedScore < 55) {
        node.confidence = Math.min(node.confidence, obs.confidence * 0.8);
      }
    }
  }

  void weakFactorNodes(input);

  const { nodes, edges } = engine.snapshot();
  const coverage = Math.min(
    1,
    edges.length / Math.max(6, nodes.length) +
      (input.verifiedFacts?.length ? 0.12 : 0) +
      (input.productUnderstanding ? 0.1 : 0),
  );
  const health = computeGraphHealth(nodes, edges, coverage);
  const propagatedConfidence = propagateGraphConfidence(nodes, edges);
  const version = nextGraphVersionLabel();

  snapshotGraphVersion({ version, nodes, edges });

  return {
    contractVersion: KNOWLEDGE_GRAPH_CONTRACT_VERSION,
    version,
    nodes,
    edges,
    coverage,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    health,
    propagatedConfidence,
    packId,
  };
}

/** Backward-compatible bridge used by Twin adapter (Wave 5). */
export function buildCausalKnowledgeGraph(input: {
  productUnderstanding?: ProductUnderstanding | null;
  verifiedFacts?: KnowledgeFact[];
  productId?: string;
  observations?: UniversalObservation[];
  weakSignals?: BuildKnowledgeGraphInput["weakSignals"];
}): CausalKnowledgeGraph {
  return buildKnowledgeGraph({
    productId: input.productId,
    productUnderstanding: input.productUnderstanding,
    verifiedFacts: input.verifiedFacts,
    observations: input.observations,
    weakSignals: input.weakSignals,
  });
}

export function detectWeakGraphNodes(input: BuildKnowledgeGraphInput): GraphNode[] {
  const graph = buildKnowledgeGraph(input);
  const weakIds = weakFactorNodes(input);
  return graph.nodes.filter((n) => weakIds.includes(n.id));
}

export { GRAPH_ENGINE_VERSION };
