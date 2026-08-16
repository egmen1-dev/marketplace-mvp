import { describe, expect, it, beforeEach } from "vitest";

import {
  PRODUCT_GENOME_CONTRACT_VERSION,
  buildProductUnderstanding,
  resolveProductIdentity,
  getCategoryPack,
  publishCrossAppProductKnowledge,
  listCrossAppProductKnowledge,
  resetCrossAppProductKnowledge,
  daosSignalsFromContentQuality,
  applyDaosToVisualGenome,
  isCcosProductPlatformEnabled,
} from "@/lib/ccos/product";
import { aggregateGenomeFromObservations } from "@/lib/marketplace-cognitive-platform/genome/aggregate";
import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import {
  collectProductUnderstandingActions,
  productUnderstandingSummary,
  toCameraScanResponse,
  startGuidedCapture,
  evaluateCaptureStep,
  advanceCaptureStep,
} from "@/lib/marketplace-cognitive-platform/product";
import { currentMarketplaceBrainVersion } from "@/lib/ccos/knowledge/versions";

const fanInput = {
  title: "Напольный вентилятор 5 лопастей для дома",
  description: "Тихий осевой вентилятор для охлаждения комнаты летом",
  categoryName: "Климатическая техника",
  photoCount: 4,
  price: 4500,
  attributes: { power: 45, noise: 38, diameter: 40 },
};

describe("ccos wave 3 product genome platform", () => {
  beforeEach(() => {
    resetCrossAppProductKnowledge();
  });

  it("resolves product identity with confidence and evidence", () => {
    const identity = resolveProductIdentity(fanInput);
    expect(identity.productType).toBe("Вентилятор");
    expect(identity.subcategory).toBe("Напольный");
    expect(identity.family).toBe("Осевой");
    expect(identity.confidence).toBeGreaterThan(0.4);
    expect(identity.evidence.length).toBeGreaterThan(0);
    expect(identity.version).toBeTruthy();
  });

  it("detects identity conflicts when text contradicts product type", () => {
    const identity = resolveProductIdentity({
      ...fanInput,
      description: "Электрический чайник для быстрого кипячения воды",
    });
    expect(identity.conflicts.some((c) => c.severity === "high")).toBe(true);
  });

  it("builds product genome independently from ranking genome", () => {
    const understanding = buildProductUnderstanding(fanInput);
    const rankingGenome = aggregateGenomeFromObservations([
      buildObservation({
        entityType: "product",
        entityId: "p1",
        metric: OBSERVATION_METRICS.content.overallQuality,
        domain: "content",
        value: 80,
        normalizedScore: 80,
        confidence: 0.9,
        evidence: ["content"],
        sourceModule: "cq",
        sourceVersion: "v1",
      }),
    ]);

    expect(understanding.genome.contractVersion).toBe(PRODUCT_GENOME_CONTRACT_VERSION);
    expect(understanding.genome.version).toBe("product-genome-v1");
    expect(rankingGenome.genomeVersion).toBe("genome-v0");
    expect(understanding.genome.dimensions.visual).not.toBeNull();
    expect(Object.keys(understanding.genome.dimensions)).toContain("emotional");
    expect(Object.keys(rankingGenome.dimensions)).toContain("seo");
    expect(Object.keys(rankingGenome.dimensions)).not.toContain("seasonality");
  });

  it("builds need graph and product DNA for a fan", () => {
    const understanding = buildProductUnderstanding(fanInput);
    expect(understanding.dna.primaryNeed).toBe("охлаждение");
    expect(understanding.dna.useCases).toContain("офис");
    expect(understanding.needGraph.nodes.some((n) => n.label === "кондиционер")).toBe(true);
    expect(understanding.needGraph.edges.some((e) => e.relation === "satisfies")).toBe(true);
  });

  it("keeps category knowledge packs isolated", () => {
    const fans = getCategoryPack("fans");
    const flowers = getCategoryPack("flowers");
    expect(fans.id).toBe("fans");
    expect(flowers.id).toBe("flowers");
    expect(fans.criticalCharacteristics).not.toEqual(flowers.criticalCharacteristics);
    expect(fans.typicalMistakes[0]).not.toBe(flowers.typicalMistakes[0]);
  });

  it("builds product relationships without ranking side effects", () => {
    const understanding = buildProductUnderstanding(fanInput);
    expect(understanding.relationships.some((r) => r.type === "complementary")).toBe(true);
    expect(understanding.relationships.some((r) => r.targetLabel === "Удлинитель")).toBe(true);
    expect(understanding.advisoryOnly).toBe(true);
  });

  it("compares products on functional axes not price/rating", () => {
    const understanding = buildProductUnderstanding(fanInput);
    const axes = understanding.comparisons.map((c) => c.axis);
    expect(axes.some((a) => /мощность|шум|качество/i.test(a))).toBe(true);
    expect(axes.some((a) => /цена|рейтинг/i.test(a))).toBe(false);
  });

  it("scores use cases for office and home", () => {
    const understanding = buildProductUnderstanding(fanInput);
    const office = understanding.useCases.find((u) => u.label === "Офис");
    expect(office).toBeTruthy();
    expect(understanding.useCases.some((u) => u.label === "Дом")).toBe(true);
  });

  it("applies DAOS visual signals to product genome when connected", () => {
    const daos = daosSignalsFromContentQuality({
      connected: true,
      photoQuality: 82,
      thumbnailQuality: 75,
    });
    const boosted = applyDaosToVisualGenome(60, daos);
    expect(boosted).toBeGreaterThan(60);
    expect(daos.source).toContain("daos");
  });

  it("reports daos-not-connected when live layer is off", () => {
    const understanding = buildProductUnderstanding({
      ...fanInput,
      daos: daosSignalsFromContentQuality({ connected: false }),
    });
    expect(understanding.daos.connected).toBe(false);
    expect(understanding.daos.source).toBe("daos-not-connected");
  });

  it("expresses product confidence as percentage label", () => {
    const understanding = buildProductUnderstanding({
      title: "X",
      photoCount: 0,
    });
    expect(understanding.confidence.overall).toBeLessThan(0.5);
    expect(["high", "medium", "low"]).toContain(understanding.confidence.label);
  });

  it("feeds product understanding into brain action candidates", () => {
    const understanding = buildProductUnderstanding({
      ...fanInput,
      title: "Чайник электрический вентилятор",
      description: "Чайник для кипячения воды",
    });
    const actions = collectProductUnderstandingActions(understanding, "p1");
    expect(actions.some((a) => a.source === "product-understanding")).toBe(true);
    expect(actions.some((a) => a.title.includes("противоречие"))).toBe(true);
  });

  it("summarizes what is sold and need solved for seller UI", () => {
    const understanding = buildProductUnderstanding(fanInput);
    const summary = productUnderstandingSummary(understanding);
    expect(summary.whatIsSold).toMatch(/Вентилятор/);
    expect(summary.needSolved).toBe("охлаждение");
    expect(summary.confidenceLabel).toMatch(/%/);
  });

  it("returns camera scan response contract", () => {
    const understanding = buildProductUnderstanding(fanInput);
    const scan = toCameraScanResponse(understanding, "Добавьте видео");
    expect(scan.productIdentity.productType).toBe("Вентилятор");
    expect(scan.genome.overall).not.toBeNull();
    expect(scan.mainIssues.length).toBeGreaterThan(0);
    expect(scan.improvements.length).toBeGreaterThan(0);
    expect(scan.nextStep).toBe("Добавьте видео");
    expect(scan.advisoryOnly).toBe(true);
  });

  it("runs guided mobile capture full scenario", () => {
    const understanding = buildProductUnderstanding(fanInput);
    let session = startGuidedCapture("p1", understanding.categoryPack.idealPhotos);
    expect(session.steps).toHaveLength(5);
    expect(session.currentStep).toBe(0);

    const heroEval = evaluateCaptureStep({
      stepId: "hero",
      photoCount: 1,
      understanding,
    });
    expect(heroEval.pass).toBe(true);

    session = advanceCaptureStep(session);
    expect(session.currentStep).toBe(1);

    const overviewEval = evaluateCaptureStep({ stepId: "overview", understanding });
    expect(overviewEval.pass).toBe(true);

    session = advanceCaptureStep(session);
    session = advanceCaptureStep(session);
    session = advanceCaptureStep(session);

    const specsEval = evaluateCaptureStep({
      stepId: "specs",
      understanding,
    });
    expect(specsEval.stepId).toBe("specs");

    session = advanceCaptureStep(session);
    expect(session.currentStep).toBe(session.steps.length - 1);
  });

  it("publishes cross-app product knowledge for ecosystem contract", () => {
    publishCrossAppProductKnowledge({
      claim: "Видео увеличивает конверсию напольных вентиляторов",
      sourceApp: "marketplace",
      targetApps: ["daos", "quicksale"],
      categoryPack: "fans",
      confidence: 0.8,
      verified: true,
    });
    const forDaos = listCrossAppProductKnowledge({ targetApp: "daos", verifiedOnly: true });
    expect(forDaos).toHaveLength(1);
    expect(forDaos[0].categoryPack).toBe("fans");
  });

  it("uses marketplace-brain-v3 when product platform flag is on", () => {
    const prev = process.env.CCOS_PRODUCT_PLATFORM_ENABLED;
    process.env.CCOS_PRODUCT_PLATFORM_ENABLED = "true";
    expect(currentMarketplaceBrainVersion()).toBe("marketplace-brain-v3-product");
    process.env.CCOS_PRODUCT_PLATFORM_ENABLED = prev;
  });

  it("product platform flag requires CCOS_ENABLED", () => {
    const prevCcos = process.env.CCOS_ENABLED;
    const prevProduct = process.env.CCOS_PRODUCT_PLATFORM_ENABLED;
    process.env.CCOS_ENABLED = "false";
    process.env.CCOS_PRODUCT_PLATFORM_ENABLED = "true";
    expect(isCcosProductPlatformEnabled()).toBe(false);
    process.env.CCOS_ENABLED = prevCcos;
    process.env.CCOS_PRODUCT_PLATFORM_ENABLED = prevProduct;
  });
});
