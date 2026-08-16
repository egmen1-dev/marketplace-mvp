import { getBrainReadableKnowledge } from "@/lib/ccos/knowledge";
import {
  buildKnowledgeGraph,
  buildGraphCacheEntry,
  cacheGraphInsights,
  capRecommendationConfidence,
  confidenceLabel,
  findWhyPath,
  getGraphEngine,
  resetGraphEngine,
} from "@/lib/ccos/graph";
import type { MobileGraphInsights, CausalKnowledgeGraph } from "@/lib/ccos/graph";
import { isCcosProductPlatformEnabled } from "@/lib/ccos/product";
import { buildMarketplaceProductUnderstanding } from "../product/adapter";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import type { UniversalObservation } from "@/lib/ccos/observation/types";

function weakSignalsFromObservations(observations: UniversalObservation[]) {
  return observations
    .filter((o) => o.normalizedScore != null && o.normalizedScore < 60)
    .slice(0, 6)
    .map((o) => ({
      metric: o.metric,
      score: o.normalizedScore ?? null,
      label: o.evidence[0] ?? o.metric,
    }));
}

export async function buildMarketplaceKnowledgeGraph(input: {
  productId: string;
  observations?: UniversalObservation[];
}): Promise<CausalKnowledgeGraph> {
  const productUnderstanding = isCcosProductPlatformEnabled()
    ? await buildMarketplaceProductUnderstanding(input.productId)
    : null;
  const verifiedFacts = getBrainReadableKnowledge({ pack: "marketplace" });

  return buildKnowledgeGraph({
    productId: input.productId,
    productUnderstanding,
    verifiedFacts,
    observations: input.observations,
    weakSignals: input.observations ? weakSignalsFromObservations(input.observations) : undefined,
    categorySlug: productUnderstanding?.identity.category ?? null,
  });
}

export function buildMobileGraphInsights(input: {
  productId: string;
  graph: CausalKnowledgeGraph;
  observations?: UniversalObservation[];
}): MobileGraphInsights {
  resetGraphEngine();
  const engine = getGraphEngine();
  for (const node of input.graph.nodes) engine.addNode(node);
  for (const edge of input.graph.edges) engine.addEdge(edge);

  const weakIds: string[] = [];
  for (const obs of input.observations ?? []) {
    if (obs.normalizedScore == null || obs.normalizedScore >= 60) continue;
    if (obs.metric === OBSERVATION_METRICS.visual.photoQuality) weakIds.push("node_photo");
    if (obs.metric === OBSERVATION_METRICS.content.overallQuality) weakIds.push("node_photo");
    if (obs.metric === OBSERVATION_METRICS.behaviour.ctr) weakIds.push("node_ctr");
    if (obs.metric === OBSERVATION_METRICS.trust.sellerScore) weakIds.push("node_trust");
  }
  if (weakIds.length === 0) weakIds.push("node_photo");

  const why = findWhyPath(engine, {
    question: "Почему товар не продаётся?",
    weakNodeIds: weakIds,
  });

  const factorScores = input.graph.edges
    .filter((e) => e.causal && weakIds.includes(e.from))
    .map((e) => {
      const node = input.graph.nodes.find((n) => n.id === e.from);
      return {
        label: node?.label ?? e.from,
        influence: e.weight,
        kind: node?.kind ?? ("factor" as const),
      };
    })
    .sort((a, b) => b.influence - a.influence)
    .slice(0, 3);

  const topFactors =
    factorScores.length > 0
      ? factorScores
      : input.graph.nodes
          .filter((n) => ["photo", "price", "trust", "ctr"].includes(n.kind))
          .slice(0, 3)
          .map((n) => ({ label: n.label, influence: n.confidence, kind: n.kind }));

  const rawConfidence = why.confidence;
  const confidence = capRecommendationConfidence(input.graph.propagatedConfidence, rawConfidence);

  const recommendedAction =
    topFactors[0]?.kind === "photo"
      ? "Замените главное фото"
      : topFactors[0]?.kind === "price"
        ? "Пересмотрите цену"
        : topFactors[0]?.kind === "trust"
          ? "Усилите доверие и отзывы"
          : "Улучшите CTR через фото и описание";

  return {
    productId: input.productId,
    primaryCause: why.path[0]?.label ?? topFactors[0]?.label ?? "Недостаточно данных",
    topFactors,
    recommendedAction,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    whyPath: why,
    advisoryOnly: true,
  };
}

export async function buildAndCacheMarketplaceGraphInsights(input: {
  productId: string;
  observations?: UniversalObservation[];
}): Promise<{ graph: CausalKnowledgeGraph; insights: MobileGraphInsights }> {
  const graph = await buildMarketplaceKnowledgeGraph(input);
  const insights = buildMobileGraphInsights({
    productId: input.productId,
    graph,
    observations: input.observations,
  });
  cacheGraphInsights(buildGraphCacheEntry({ productId: input.productId, graph, insights }));
  return { graph, insights };
}
