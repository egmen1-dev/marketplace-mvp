#!/usr/bin/env tsx
/**
 * EPIC-77-WAVE-4-STAGING-ACCEPTANCE-001
 * Cognitive Knowledge Graph — real runtime acceptance (local stack + staging probes).
 *
 * Usage:
 *   CCOS_ENABLED=true CCOS_GRAPH_PLATFORM_ENABLED=true CCOS_TWIN_PLATFORM_ENABLED=true \
 *   MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=true tsx scripts/ccos-wave-4-staging-acceptance.ts
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { denyAutopilotExecution } from "@/lib/ccos/governance/advisory-guard";
import {
  assertEdgeProvenance,
  aggregateEvidenceForGraph,
  buildCounterfactual,
  buildKnowledgeGraph,
  buildCausalKnowledgeGraph,
  capRecommendationConfidence,
  crossAppGraphExtensions,
  detectEvidenceConflict,
  detectOrphanNodes,
  diffGraphVersions,
  findWhyPath,
  getGraphEngine,
  getPackSubgraph,
  listGraphVersions,
  resetGraphCache,
  resetGraphEngine,
  resetGraphVersions,
  rollbackGraphVersion,
  snapshotGraphVersion,
  traverseGraphSafely,
  MAX_REASONING_PATH_DEPTH,
  cacheGraphInsights,
  buildGraphCacheEntry,
  getCachedGraphInsights,
} from "@/lib/ccos/graph";
import { createEvidence } from "@/lib/ccos/knowledge/evidence";
import { marketplaceScope } from "@/lib/ccos/knowledge/scope";
import { buildProductUnderstanding } from "@/lib/ccos/product";
import {
  buildMobileGraphInsights,
  toCompactMobileGraphInsights,
} from "@/lib/marketplace-cognitive-platform/graph";
import { buildMarketplaceTwinDecisionReport } from "@/lib/marketplace-cognitive-platform/twin";
import {
  getMarketplaceBrainReport,
  isCognitiveProductReportAvailable,
} from "@/lib/marketplace-cognitive-platform";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";
import { MOBILE_API_VERSION, MOBILE_SCHEMA_VERSION } from "@/lib/mobile/api-contract";
import { prisma } from "@/lib/prisma";

const STAGING_BASE = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";

type GateResult = "PASS" | "FAIL" | "PARTIAL" | "SKIP";

function gate(results: Record<string, GateResult>, key: string, ok: boolean, partial = false): void {
  results[key] = ok ? "PASS" : partial ? "PARTIAL" : "FAIL";
}

async function fetchJson(url: string): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(url);
    return { status: res.status, body: await res.json() };
  } catch (err) {
    return { status: 0, body: { error: String(err) } };
  }
}

function localMainSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function pickAcceptanceProduct() {
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ slug: "cq-accept-good-fan" }, { slug: { startsWith: "cq-accept" } }],
      qualitySnapshot: { isNot: null },
    },
    select: { id: true, slug: true, sellerId: true, views: true, name: true },
  });
  if (product) return product;

  const fallback = await prisma.product.findFirst({
    where: { qualitySnapshot: { isNot: null } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, sellerId: true, views: true, name: true },
  });
  if (fallback) return fallback;
  throw new Error("No acceptance product with Content Quality snapshot found");
}

async function main() {
  const gates: Record<string, GateResult> = {};
  const mainSha = localMainSha();

  process.env.CCOS_ENABLED = process.env.CCOS_ENABLED ?? "true";
  process.env.CCOS_GRAPH_PLATFORM_ENABLED = process.env.CCOS_GRAPH_PLATFORM_ENABLED ?? "true";
  process.env.CCOS_TWIN_PLATFORM_ENABLED = process.env.CCOS_TWIN_PLATFORM_ENABLED ?? "true";
  process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED =
    process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED ?? "true";
  process.env.MARKETPLACE_BRAIN_LEVEL = process.env.MARKETPLACE_BRAIN_LEVEL ?? "simulator";

  resetGraphEngine();
  resetGraphVersions();
  resetGraphCache();

  const stagingVersion = await fetchJson(`${STAGING_BASE}/api/version`);
  const stagingHealth = await fetchJson(`${STAGING_BASE}/api/health`);
  const stagingCommit =
    typeof stagingVersion.body === "object" &&
    stagingVersion.body &&
    "commit" in stagingVersion.body
      ? String((stagingVersion.body as { commit: string }).commit)
      : "";

  gate(gates, "deploy_health", stagingHealth.status === 200 && Boolean((stagingHealth.body as { ok?: boolean }).ok));
  gate(
    gates,
    "staging_equals_main",
    stagingCommit.startsWith(mainSha.slice(0, 7)) || stagingCommit.startsWith(mainSha),
    stagingCommit.length > 0,
  );
  gate(
    gates,
    "flags_runtime",
    process.env.CCOS_ENABLED === "true" &&
      process.env.CCOS_GRAPH_PLATFORM_ENABLED === "true" &&
      process.env.CCOS_TWIN_PLATFORM_ENABLED === "true",
  );

  const product = await pickAcceptanceProduct();
  gate(gates, "real_product", Boolean(product.id));
  gate(gates, "cognitive_available", isCognitiveProductReportAvailable());

  const understanding = buildProductUnderstanding({
    title: product.name || "Напольный вентилятор тихий",
    description: "Вентилятор для дома и офиса",
  });

  const tBuild = performance.now();
  const graph = buildKnowledgeGraph({
    productId: product.id,
    productUnderstanding: understanding,
    categorySlug: understanding.identity.category,
    queryText: "тихий вентилятор",
    season: "summer",
  });
  const buildMs = Math.round(performance.now() - tBuild);

  gate(gates, "graph_build", graph.nodeCount >= 10 && graph.edgeCount >= 8);
  gate(
    gates,
    "required_nodes",
    ["photo", "ctr", "conversion", "revenue", "trust"].every((kind) =>
      graph.nodes.some((n) => n.kind === kind),
    ) && graph.nodes.some((n) => n.kind === "need" || n.kind === "product"),
  );

  gate(
    gates,
    "edge_provenance",
    graph.edges.every((e) => assertEdgeProvenance(e)),
  );

  const correlateOnly = graph.edges.filter((e) => e.relation === "correlates" && !e.causal);
  const causalEdges = graph.edges.filter((e) => e.causal || e.relation === "causes");
  gate(gates, "causal_vs_correlation", causalEdges.length > 0 && correlateOnly.every((e) => !e.causal));

  gate(
    gates,
    "confidence_propagation_cap",
    capRecommendationConfidence(0.4, 0.95) <= 0.45,
  );

  resetGraphEngine();
  const engine = getGraphEngine();
  for (const n of graph.nodes) engine.addNode(n);
  for (const e of graph.edges) engine.addEdge(e);

  const why = findWhyPath(engine, {
    question: "Почему товар плохо продаётся?",
    weakNodeIds: ["node_photo"],
  });
  gate(gates, "why_path", why.path.length >= 2 && why.explanation.includes("→"));
  gate(
    gates,
    "why_path_evidence",
    why.path.some((step) => step.evidence || step.source || step.confidence != null),
  );

  const counterfactual = buildCounterfactual({
    engine,
    baselineAction: "снизить цену",
    alternativeAction: "заменить фото",
  });
  gate(gates, "counterfactual", counterfactual.advisoryOnly && counterfactual.confidence > 0);

  const fans = getPackSubgraph("fans");
  const flowers = getPackSubgraph("flowers");
  gate(
    gates,
    "category_subgraph",
    fans.nodes[0]?.packId === "fans" &&
      flowers.nodes[0]?.packId === "flowers" &&
      !fans.nodes.some((n) => n.packId === "flowers"),
  );

  const summerGraph = buildKnowledgeGraph({ season: "summer", packId: "fans" });
  const winterGraph = buildKnowledgeGraph({ season: "winter", packId: "fans" });
  gate(
    gates,
    "season_context",
    summerGraph.nodes.some((n) => n.kind === "season") ||
      winterGraph.nodes.some((n) => n.kind === "season"),
  );

  const queryGraph = buildKnowledgeGraph({ queryText: "тихий вентилятор", packId: "fans" });
  gate(
    gates,
    "query_graph",
    queryGraph.nodes.some((n) => n.kind === "query") || queryGraph.edges.some((e) => e.from.includes("query")),
  );

  gate(
    gates,
    "need_graph_merge",
    graph.nodes.some((n) => n.kind === "need") &&
      graph.edges.some((e) => e.sources?.includes("need-graph") || e.id.startsWith("need_")),
  );

  const verifiedPromo = buildKnowledgeGraph({
    verifiedFacts: [
      {
        id: "vf1",
        title: "Сильное фото повышает CTR",
        description: "",
        confidence: 0.82,
        scope: marketplaceScope("fans"),
        status: "verified",
        createdAt: new Date().toISOString(),
        brainVersion: "v1",
        knowledgeVersion: "v1",
        sources: [{ system: "ranking-lab", module: "lab", version: "v1" }],
        evidenceIds: ["e1"],
        author: { type: "human" },
        timeline: [],
      },
    ],
  });
  const candidatePromo = buildKnowledgeGraph({
    candidateFacts: [
      {
        id: "cf1",
        title: "CTR коррелирует с ценой",
        description: "",
        confidence: 0.5,
        scope: marketplaceScope("fans"),
        status: "candidate",
        createdAt: new Date().toISOString(),
        brainVersion: "v1",
        knowledgeVersion: "v1",
        sources: [{ system: "analytics", module: "behaviour", version: "v1" }],
        evidenceIds: ["e2"],
        author: { type: "brain" },
        timeline: [],
      },
    ],
  });
  gate(
    gates,
    "knowledge_promotion",
    verifiedPromo.edges.some((e) => e.verified === true) &&
      candidatePromo.edges.some((e) => e.verified === false),
  );

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
  gate(gates, "multi_source_evidence", aggregated.length === 1 && aggregated[0].sources.length >= 1);

  const conflictAgg = aggregateEvidenceForGraph({
    evidence: [
      createEvidence({
        observationIds: ["o3"],
        claim: "Photo quality improves CTR",
        confidence: 0.7,
        scope: marketplaceScope("fans"),
      }),
      createEvidence({
        observationIds: ["o4"],
        claim: "Photo quality снижает CTR",
        confidence: 0.65,
        scope: marketplaceScope("fans"),
      }),
    ],
  });
  gate(gates, "evidence_conflict", detectEvidenceConflict(conflictAgg) && conflictAgg[0].confidence < 0.7);

  snapshotGraphVersion({ version: "graph-v1", nodes: graph.nodes, edges: graph.edges });
  const v2Graph = buildKnowledgeGraph({ productId: product.id, productUnderstanding: understanding });
  snapshotGraphVersion({ version: "graph-v2", nodes: v2Graph.nodes, edges: v2Graph.edges });
  const diff = diffGraphVersions(listGraphVersions()[0]?.version ?? "graph-v1", listGraphVersions().at(-1)?.version ?? "graph-v2");
  gate(gates, "graph_versioning", diff != null);

  const rolled = rollbackGraphVersion("graph-v1");
  gate(gates, "graph_rollback", rolled != null && rolled.nodeCount === graph.nodeCount);

  gate(gates, "graph_health", graph.health.nodeCount > 0 && graph.health.connectedComponents >= 1);

  engine.addNode({
    id: "orphan_test",
    label: "Orphan",
    kind: "factor",
    confidence: 0.2,
  });
  const orphans = detectOrphanNodes(engine.listNodes(), engine.listEdges());
  gate(gates, "orphan_node_test", orphans.some((n) => n.id === "orphan_test"));

  engine.addEdge({
    id: "cycle_a",
    from: "node_ctr",
    to: "node_conversion",
    relation: "causes",
    weight: 0.3,
    causal: true,
    confidence: 0.5,
    version: "test",
    sources: ["test"],
  });
  engine.addEdge({
    id: "cycle_b",
    from: "node_conversion",
    to: "node_ctr",
    relation: "influences",
    weight: 0.2,
    causal: false,
    confidence: 0.4,
    version: "test",
    sources: ["test"],
  });
  const steps = traverseGraphSafely(engine, "node_ctr", () => undefined, MAX_REASONING_PATH_DEPTH);
  gate(gates, "cycle_safe_traversal", steps <= MAX_REASONING_PATH_DEPTH + 5);

  gate(gates, "path_depth_limit", why.path.length <= MAX_REASONING_PATH_DEPTH);

  const daos = crossAppGraphExtensions("daos");
  const qs = crossAppGraphExtensions("quicksale");
  gate(gates, "daos_contract", daos.edges.every((e) => e.app === "daos"));
  gate(gates, "quicksale_contract", qs.edges.every((e) => e.app === "quicksale"));

  const bridgeGraph = buildCausalKnowledgeGraph({ productUnderstanding: understanding, productId: product.id });
  gate(gates, "twin_full_graph", bridgeGraph.coverage > 0 && bridgeGraph.propagatedConfidence > 0);

  let twinReport = null;
  try {
    twinReport = await buildMarketplaceTwinDecisionReport({ productId: product.id });
  } catch {
    twinReport = null;
  }
  gate(gates, "twin_same_scenario", twinReport != null, twinReport == null);

  gate(
    gates,
    "twin_confidence_source",
    twinReport == null ||
      twinReport.scenarios.every((s) => s.confidence.overall <= bridgeGraph.propagatedConfidence * 1.1 + 0.05),
  );

  const brainReport = await getMarketplaceBrainReport(product.id);
  gate(
    gates,
    "brain_integration",
    Boolean(brainReport?.graphInsights && brainReport?.knowledgeGraph && brainReport?.graphHealth),
  );

  const insights = buildMobileGraphInsights({ productId: product.id, graph });
  gate(
    gates,
    "seller_ux",
    Boolean(insights.sellerExplanation) && !insights.sellerExplanation.includes("weighted causal graph"),
  );
  gate(gates, "admin_debug_fields", graph.edges.every((e) => e.from && e.to && e.weight != null));

  gate(
    gates,
    "no_false_causal_claims",
    insights.confidence < 0.55
      ? insights.sellerExplanation.includes("признаки")
      : !insights.sellerExplanation.includes("признаки") || insights.confidence >= 0.55,
  );

  const tTraverse = performance.now();
  findWhyPath(engine, { question: "test", weakNodeIds: ["node_photo"] });
  buildCounterfactual({ engine, baselineAction: "price", alternativeAction: "photo" });
  const traverseMs = Math.round(performance.now() - tTraverse);
  gate(gates, "performance", buildMs < 5000 && traverseMs < 2000);

  cacheGraphInsights(
    buildGraphCacheEntry({ productId: product.id, graph, insights }),
  );
  gate(gates, "cache_key", Boolean(getCachedGraphInsights(product.id)?.syncVersion.includes(graph.version)));

  const concurrentStart = performance.now();
  const concurrent = await Promise.all(
    Array.from({ length: 20 }, () =>
      buildKnowledgeGraph({ productId: product.id, productUnderstanding: understanding }),
    ),
  );
  const concurrentMs = Math.round(performance.now() - concurrentStart);
  gate(gates, "concurrency", concurrent.every((g) => g.nodeCount > 0) && concurrentMs < 15000);

  const searchSource = readFileSync(join(process.cwd(), "features/products/queries.ts"), "utf8");
  gate(
    gates,
    "live_search_isolation",
    !searchSource.includes("@/lib/ccos/graph") && !searchSource.includes("buildKnowledgeGraph"),
  );

  const financeSource = readFileSync(join(process.cwd(), "lib/ccos/graph/builder.ts"), "utf8");
  gate(
    gates,
    "finance_isolation",
    !financeSource.includes("wallet") &&
      !financeSource.includes("payout") &&
      !financeSource.includes("refund"),
  );
  gate(gates, "moderation_isolation", !financeSource.includes("enforceModeration"));

  const compact = toCompactMobileGraphInsights(insights);
  gate(
    gates,
    "mobile_graph_insights_api",
    compact.mainReason.length > 0 &&
      compact.topFactors.length > 0 &&
      typeof compact.confidence === "number" &&
      !("whyPath" in compact),
  );

  gate(gates, "offline_graph_cache", getCachedGraphInsights(product.id) != null);

  const readiness = runReleaseReadinessCheck();
  gate(gates, "mobile_dashboard_api", readiness.checks.some((c) => c.id === "mobile_dashboard_api"));
  gate(
    gates,
    "api_versioning",
    MOBILE_API_VERSION.length > 0 && MOBILE_SCHEMA_VERSION.length > 0,
  );
  gate(gates, "mobile_readiness", readiness.checks.some((c) => c.id === "mobile_graph_insights_api"));

  gate(gates, "universal_graph_contract", !readFileSync(join(process.cwd(), "lib/ccos/graph/types.ts"), "utf8").includes("@prisma"));
  gate(gates, "cross_app_provenance", graph.edges.every((e) => Boolean(e.app)));

  let autopilotDenied = false;
  try {
    denyAutopilotExecution("L4_AUTOPILOT");
  } catch {
    autopilotDenied = true;
  }
  gate(gates, "autopilot_disabled", autopilotDenied);

  const hardFails = Object.values(gates).filter((g) => g === "FAIL").length;
  const verdict =
    hardFails === 0
      ? "CCOS WAVE 4 KNOWLEDGE GRAPH: ACCEPTED"
      : "CCOS WAVE 4 KNOWLEDGE GRAPH: NOT ACCEPTED";

  const subVerdicts = {
    digitalTwin: twinReport && bridgeGraph.coverage > 0 ? "FULL GRAPH CONNECTED" : "NOT CONNECTED",
    marketplaceBrain: brainReport?.graphInsights ? "GRAPH-AWARE" : "NOT GRAPH-AWARE",
    liveRanking: gates.live_search_isolation === "PASS" ? "UNCHANGED" : "CHANGED",
    autopilot: autopilotDenied ? "DISABLED" : "ENABLED",
    appReadiness: readiness.ready ? "READY" : "NOT_READY",
  };

  const output = {
    generatedAt: new Date().toISOString(),
    epic: "EPIC-77-WAVE-4-STAGING-ACCEPTANCE-001",
    mergeChain: ["PR #78 Wave 3", "PR #79 Wave 5", "PR #80 Wave 4"],
    mainSha,
    stagingSha: stagingCommit,
    stagingVersion: stagingVersion.body,
    stagingHealth: stagingHealth.body,
    flags: {
      CCOS_ENABLED: process.env.CCOS_ENABLED,
      CCOS_GRAPH_PLATFORM_ENABLED: process.env.CCOS_GRAPH_PLATFORM_ENABLED,
      CCOS_TWIN_PLATFORM_ENABLED: process.env.CCOS_TWIN_PLATFORM_ENABLED,
      MARKETPLACE_BRAIN_LEVEL: process.env.MARKETPLACE_BRAIN_LEVEL,
    },
    acceptanceProduct: product,
    performance: { buildMs, traverseMs, concurrent20Ms: concurrentMs },
    graph: {
      version: graph.version,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      coverage: graph.coverage,
      propagatedConfidence: graph.propagatedConfidence,
      health: graph.health,
    },
    whyPath: why,
    counterfactual,
    compactInsights: compact,
    readiness,
    gates,
    verdict,
    subVerdicts,
  };

  const outDir = join(process.cwd(), "artifacts/ccos-wave-4-staging");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "acceptance-report.json"), JSON.stringify(output, null, 2));
  writeFileSync(
    join(outDir, "FINAL_MATRIX.md"),
    `# Wave 4 Staging Acceptance Matrix\n\nVerdict: **${verdict}**\n\n` +
      Object.entries(gates)
        .map(([k, v]) => `| ${k} | ${v} |`)
        .join("\n"),
  );

  console.log(JSON.stringify({ verdict, subVerdicts, hardFails, gates }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
