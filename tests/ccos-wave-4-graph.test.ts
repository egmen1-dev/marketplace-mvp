import { describe, expect, it, beforeEach } from "vitest";

import {
  buildKnowledgeGraph,
  buildCausalKnowledgeGraph,
  buildCounterfactual,
  capRecommendationConfidence,
  computeGraphHealth,
  CORE_CAUSAL_CHAIN,
  getGraphEngine,
  resetGraphCache,
  resetGraphEngine,
  resetGraphVersions,
  findWhyPath,
  promoteFactToGraph,
  propagateGraphConfidence,
  aggregateEvidenceForGraph,
  getPackSubgraph,
  crossAppGraphExtensions,
  isCcosGraphPlatformEnabled,
  cacheGraphInsights,
  getCachedGraphInsights,
  buildGraphCacheEntry,
} from "@/lib/ccos/graph";
import { createEvidence } from "@/lib/ccos/knowledge/evidence";
import { buildProductUnderstanding } from "@/lib/ccos/product";
import { buildMobileGraphInsights } from "@/lib/marketplace-cognitive-platform/graph";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";
import { currentMarketplaceBrainVersion } from "@/lib/ccos/knowledge/versions";
import { marketplaceScope } from "@/lib/ccos/knowledge/scope";

describe("ccos wave 4 knowledge graph platform", () => {
  beforeEach(() => {
    resetGraphEngine();
    resetGraphVersions();
    resetGraphCache();
  });

  it("builds universal graph with Photo → CTR → Conversion → Revenue weights", () => {
    const graph = buildKnowledgeGraph({});
    const photoCtr = graph.edges.find((e) => e.from === "node_photo" && e.to === "node_ctr");
    expect(photoCtr?.weight).toBeCloseTo(0.42);
    expect(photoCtr?.relation).toBe("causes");
    expect(graph.health.nodeCount).toBeGreaterThan(10);
    expect(graph.propagatedConfidence).toBeGreaterThan(0);
  });

  it("keeps backward-compatible buildCausalKnowledgeGraph bridge for Twin", () => {
    const understanding = buildProductUnderstanding({
      title: "Напольный вентилятор",
      description: "Тихий вентилятор для дома",
    });
    const graph = buildCausalKnowledgeGraph({ productUnderstanding: understanding });
    expect(graph.coverage).toBeGreaterThan(0);
    expect(graph.health).toBeTruthy();
  });

  it("traverses why path for low sales question", () => {
    const graph = buildKnowledgeGraph({});
    resetGraphEngine();
    const engine = getGraphEngine();
    for (const n of graph.nodes) engine.addNode(n);
    for (const e of graph.edges) engine.addEdge(e);

    const why = findWhyPath(engine, {
      question: "Почему вентилятор не продаётся?",
      weakNodeIds: ["node_photo"],
    });
    expect(why.path.length).toBeGreaterThanOrEqual(2);
    expect(why.explanation).toContain("→");
  });

  it("propagates confidence and caps brain recommendations", () => {
    const capped = capRecommendationConfidence(0.4, 0.95);
    expect(capped).toBeCloseTo(0.42, 2);
    expect(capped).toBeGreaterThan(0.2);
  });

  it("aggregates multi-source evidence", () => {
    const aggregated = aggregateEvidenceForGraph({
      evidence: [
        createEvidence({
          observationIds: ["o1"],
          claim: "Hero photo improves CTR",
          confidence: 0.7,
          scope: marketplaceScope("fans"),
        }),
        createEvidence({
          observationIds: ["o2"],
          claim: "Hero photo improves CTR",
          confidence: 0.75,
          scope: marketplaceScope("fans"),
        }),
      ],
    });
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0].confidence).toBeGreaterThan(0.7);
  });

  it("promotes verified facts into graph nodes", () => {
    const { node } = promoteFactToGraph({
      id: "kf_photo",
      title: "Сильное фото повышает CTR",
      description: "test",
      confidence: 0.8,
      scope: marketplaceScope("fans"),
      status: "verified",
      createdAt: new Date().toISOString(),
      brainVersion: "v1",
      knowledgeVersion: "v1",
      sources: [{ system: "ranking-lab", module: "lab", version: "v1" }],
      evidenceIds: [],
      author: { type: "human" },
      timeline: [],
    });
    expect(node.id).toContain("kf_photo");
  });

  it("builds counterfactual graph reasoning", () => {
    const graph = buildKnowledgeGraph({});
    resetGraphEngine();
    const engine = getGraphEngine();
    for (const n of graph.nodes) engine.addNode(n);
    for (const e of graph.edges) engine.addEdge(e);

    const cf = buildCounterfactual({
      engine,
      baselineAction: "снизить цену",
      alternativeAction: "заменить фото",
    });
    expect(cf.advisoryOnly).toBe(true);
    expect(cf.predictedOutcome).toMatch(/фото/i);
  });

  it("isolates category pack subgraphs", () => {
    const fans = getPackSubgraph("fans");
    const flowers = getPackSubgraph("flowers");
    expect(fans.nodes[0]?.packId).toBe("fans");
    expect(flowers.nodes[0]?.packId).toBe("flowers");
    expect(fans.nodes[0]?.id).not.toBe(flowers.nodes[0]?.id);
  });

  it("adds cross-app nodes for DAOS and QuickSale", () => {
    const daos = crossAppGraphExtensions("daos");
    const qs = crossAppGraphExtensions("quicksale");
    expect(daos.nodes.some((n) => n.kind === "lighting")).toBe(true);
    expect(qs.nodes.some((n) => n.kind === "buyer_intent")).toBe(true);
  });

  it("computes graph health metrics", () => {
    const graph = buildKnowledgeGraph({});
    expect(["strong", "moderate", "sparse"]).toContain(graph.health.label);
    expect(graph.health.connectedComponents).toBeGreaterThan(0);
  });

  it("builds mobile graph insights contract", () => {
    const graph = buildKnowledgeGraph({
      productUnderstanding: buildProductUnderstanding({ title: "Вентилятор напольный" }),
    });
    const insights = buildMobileGraphInsights({ productId: "p1", graph });
    expect(insights.topFactors.length).toBeGreaterThan(0);
    expect(insights.recommendedAction.length).toBeGreaterThan(5);
    expect(insights.advisoryOnly).toBe(true);
  });

  it("caches graph insights for offline mode", () => {
    const graph = buildKnowledgeGraph({});
    const insights = buildMobileGraphInsights({ productId: "p1", graph });
    cacheGraphInsights(buildGraphCacheEntry({ productId: "p1", graph, insights }));
    expect(getCachedGraphInsights("p1")?.syncVersion).toBeTruthy();
  });

  it("runs release readiness checklist", () => {
    const report = runReleaseReadinessCheck();
    expect(report.total).toBeGreaterThan(5);
    expect(report.checks.some((c) => c.id === "graph_enabled")).toBe(true);
  });

  it("uses marketplace-brain-v4 when graph flag is on", () => {
    const prevGraph = process.env.CCOS_GRAPH_PLATFORM_ENABLED;
    const prevTwin = process.env.CCOS_TWIN_PLATFORM_ENABLED;
    process.env.CCOS_TWIN_PLATFORM_ENABLED = "false";
    process.env.CCOS_GRAPH_PLATFORM_ENABLED = "true";
    expect(currentMarketplaceBrainVersion()).toBe("marketplace-brain-v4-graph");
    process.env.CCOS_GRAPH_PLATFORM_ENABLED = prevGraph;
    process.env.CCOS_TWIN_PLATFORM_ENABLED = prevTwin;
  });

  it("graph platform flag requires CCOS_ENABLED", () => {
    const prevCcos = process.env.CCOS_ENABLED;
    const prevGraph = process.env.CCOS_GRAPH_PLATFORM_ENABLED;
    process.env.CCOS_ENABLED = "false";
    process.env.CCOS_GRAPH_PLATFORM_ENABLED = "true";
    expect(isCcosGraphPlatformEnabled()).toBe(false);
    process.env.CCOS_ENABLED = prevCcos;
    process.env.CCOS_GRAPH_PLATFORM_ENABLED = prevGraph;
  });

  it("core causal chain matches spec weights sum pattern", () => {
    const sum = CORE_CAUSAL_CHAIN.reduce((s, e) => s + e.weight, 0);
    expect(sum).toBeCloseTo(1.01, 1);
  });
});
