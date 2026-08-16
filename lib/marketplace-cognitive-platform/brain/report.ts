import { buildCognitiveContext, type BuildCognitiveContextInput } from "@/lib/ccos/context/builder";
import { collectObservations } from "@/lib/ccos/observation/registry";
import {
  ADVISORY_ONLY,
  MARKETPLACE_BRAIN_MATURITY,
  assertAdvisoryReport,
} from "@/lib/ccos/governance";

import { MARKETPLACE_BRAIN_VERSION } from "../flags";
import { aggregateGenomeFromObservations } from "../genome/aggregate";
import { ensureMarketplacePublishersRegistered } from "../publishers/registry";
import { trackCcosEvent } from "@/lib/ccos/telemetry";
import {
  buildDecisionBlockers,
  buildExplanationFromObservations,
  buildProvenance,
  pickNextStep,
} from "./explain";
import type { CognitiveProductReport } from "./types";

export async function getCognitiveProductReport(
  productId: string,
  context?: BuildCognitiveContextInput["overrides"],
): Promise<CognitiveProductReport | null> {
  ensureMarketplacePublishersRegistered();

  const cognitiveContext = await buildCognitiveContext({
    productId,
    overrides: context,
  });

  const { observations, publisherHealth } = await collectObservations({
    app: "marketplace",
    entity: { type: "product", id: productId },
    context: cognitiveContext,
  });

  if (observations.length === 0 && publisherHealth.every((p) => p.status === "SKIPPED")) {
    return null;
  }

  const genome = aggregateGenomeFromObservations(observations);
  const explanation = buildExplanationFromObservations(observations);
  const blockers = buildDecisionBlockers(observations);

  const report: CognitiveProductReport = {
    productId,
    observations,
    genome,
    explanation: {
      headline: explanation.headline,
      factorDeltas: explanation.factorDeltas,
    },
    blockers,
    strengths: explanation.strengths,
    missingData: explanation.missingData,
    nextStep: null,
    publisherHealth,
    maturityLevel: MARKETPLACE_BRAIN_MATURITY,
    brainVersion: MARKETPLACE_BRAIN_VERSION,
    advisoryOnly: ADVISORY_ONLY,
    provenance: buildProvenance(observations),
  };

  report.nextStep = pickNextStep(report);

  trackCcosEvent("ccos_report_generated");
  return assertAdvisoryReport(report);
}
