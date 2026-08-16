import type { BuildProductUnderstandingInput, ProductUnderstanding } from "./types";
import { resolveProductIdentity } from "./identity";
import { buildProductDNA } from "./dna";
import { buildNeedGraph } from "./need-graph";
import { buildProductRelationships } from "./relationships";
import { buildProductComparison } from "./comparison";
import { buildUseCaseIntelligence } from "./use-cases";
import { resolveCategoryPack } from "./category-packs";
import { buildProductContext } from "./context";
import { buildProductGenome, computeProductConfidence } from "./genome";
import { normalizeDaosSignals } from "./daos-layer";

export function buildProductUnderstanding(
  input: BuildProductUnderstandingInput,
): ProductUnderstanding {
  const identity = resolveProductIdentity(input);
  const dna = buildProductDNA(input, identity);
  const needGraph = buildNeedGraph(identity, dna);
  const relationships = buildProductRelationships(identity);
  const comparisons = buildProductComparison(input, identity);
  const useCases = buildUseCaseIntelligence(identity, dna);
  const categoryPack = resolveCategoryPack(identity);
  const context = buildProductContext(input);
  const daos = normalizeDaosSignals(input.daos);
  const genome = buildProductGenome({ source: input, identity, daos, context });
  const confidence = computeProductConfidence({
    identity,
    genome,
    hasDescription: Boolean(input.description && input.description.length > 20),
    photoCount: input.photoCount ?? 0,
  });

  return {
    productId: input.productId,
    identity,
    genome,
    dna,
    needGraph,
    relationships,
    comparisons,
    useCases,
    categoryPack,
    context,
    daos,
    confidence,
    advisoryOnly: true,
  };
}
