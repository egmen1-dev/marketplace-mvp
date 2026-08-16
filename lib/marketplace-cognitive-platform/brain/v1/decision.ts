import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import type { UniversalObservation } from "@/lib/ccos/observation/types";

import type { BrainBlocker, CognitiveDecision } from "./types";

const LAYERS = [
  "compliance",
  "moderation",
  "product_identity",
  "quality_gates",
  "trust_safety",
  "eligibility",
  "commercial_advice",
] as const;

export function orchestrateDecision(input: {
  observations: UniversalObservation[];
  blockers: BrainBlocker[];
  qualityGateFailed: boolean;
}): CognitiveDecision {
  const reasons: string[] = [];
  const blockedCapabilities: string[] = [];
  const sourceSystems: string[] = [];

  if (input.qualityGateFailed) {
    reasons.push("Content Quality gate активен");
    blockedCapabilities.push("promotion_advice", "ranking_simulation");
    sourceSystems.push("marketplace-content-quality");
  }

  for (const blocker of input.blockers) {
    if (blocker.layer === "moderation" || blocker.code.includes("QUALITY")) {
      blockedCapabilities.push("promotion_advice");
      reasons.push(blocker.title);
      sourceSystems.push(blocker.source);
    }
  }

  const prohibited = input.observations.some(
    (o) => o.metric === OBSERVATION_METRICS.content.gateBlocked && o.value === true,
  );
  if (prohibited) {
    blockedCapabilities.push("promotion_advice", "ranking_simulation");
    reasons.push("Moderation/quality enforcement active");
    sourceSystems.push("marketplace-trust-loop");
  }

  return {
    allowed: true,
    blockedCapabilities: [...new Set(blockedCapabilities)],
    reasons,
    sourceSystems: [...new Set(sourceSystems)],
  };
}

export function blockerFromObservations(
  observations: UniversalObservation[],
): BrainBlocker[] {
  const blockers: BrainBlocker[] = [];
  for (const obs of observations) {
    if (obs.metric === OBSERVATION_METRICS.content.gateBlocked && obs.value === true) {
      blockers.push({
        code: "CONTENT_QUALITY_GATE",
        title: "Content Quality gate",
        source: obs.source.module,
        layer: "quality_gates",
        enforcementNote: "Enforcement остаётся в Content Quality / moderation layer",
      });
    }
    if (obs.metric === OBSERVATION_METRICS.content.qualityGate && typeof obs.value === "string") {
      blockers.push({
        code: String(obs.value),
        title: `Gate: ${obs.value}`,
        source: obs.source.module,
        layer: "quality_gates",
        enforcementNote: "Advisory mirror of existing gate state",
      });
    }
  }
  return blockers;
}

export { LAYERS };
