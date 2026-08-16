import type {
  BuildProductUnderstandingInput,
  DaosVisualSignals,
  ProductConfidence,
  ProductGenome,
  ProductGenomeDimensions,
  ProductIdentity,
  ProductContext,
} from "./types";
import { PRODUCT_GENOME_CONTRACT_VERSION } from "./types";
import { applyContextToGenomeDimensions, buildProductContext } from "./context";
import { applyDaosToVisualGenome } from "./daos-layer";

export function computeProductConfidence(input: {
  identity: ProductIdentity;
  genome: ProductGenome;
  hasDescription: boolean;
  photoCount: number;
}): ProductConfidence {
  const identity = input.identity.confidence;
  const dna = input.hasDescription ? 0.72 : 0.4;
  const genome = input.genome.confidence;
  const overall = identity * 0.45 + dna * 0.25 + genome * 0.3;
  const label = overall >= 0.75 ? "high" : overall >= 0.45 ? "medium" : "low";
  return { overall, identity, dna, genome, label };
}

export function buildProductGenome(input: {
  source: BuildProductUnderstandingInput;
  identity: ProductIdentity;
  daos: DaosVisualSignals;
  context?: ProductContext;
}): ProductGenome {
  const ctx = input.context ?? buildProductContext(input.source);
  const photoCount = input.source.photoCount ?? 0;
  const descLen = (input.source.description ?? "").length;

  let dimensions: ProductGenomeDimensions = {
    visual: Math.min(100, 35 + photoCount * 10),
    commercial: input.source.price != null ? 65 : 45,
    functional: descLen > 80 ? 72 : 48,
    emotional: 55,
    seasonality: ctx.season === "summer" ? 78 : ctx.season === "winter" ? 42 : 58,
    audience: 60,
    complexity: Object.keys(input.source.attributes ?? {}).length > 3 ? 70 : 45,
    trust: input.identity.conflicts.length === 0 ? 75 : 40,
    lifecycle: 55,
    priceSegment:
      input.source.price != null
        ? input.source.price <= 3000
          ? 35
          : input.source.price <= 7000
            ? 55
            : 75
        : null,
  };

  dimensions.visual = applyDaosToVisualGenome(dimensions.visual, input.daos);
  dimensions = applyContextToGenomeDimensions(dimensions, ctx) as ProductGenomeDimensions;

  const present = Object.values(dimensions).filter((v) => v != null) as number[];
  const overall =
    present.length > 0 ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null;

  const confidence =
    input.identity.confidence * 0.5 +
    (input.daos.connected ? 0.25 : 0.1) +
    (photoCount > 0 ? 0.15 : 0.05);

  return {
    overall,
    dimensions,
    confidence: Math.min(1, confidence),
    version: "product-genome-v1",
    contractVersion: PRODUCT_GENOME_CONTRACT_VERSION,
    computedAt: new Date().toISOString(),
  };
}
