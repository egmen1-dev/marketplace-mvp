import { isCcosEvolutionPlatformEnabled } from "@/lib/ccos/evolution/flags";
import { isCcosGraphPlatformEnabled } from "@/lib/ccos/graph/flags";
import { isCcosTwinPlatformEnabled } from "@/lib/ccos/twin/flags";
import { MARKETPLACE_BRAIN_MATURITY } from "@/lib/ccos/governance/maturity";

export type CognitiveCapabilitiesManifest = {
  brain: boolean;
  graph: boolean;
  twin: boolean;
  evolutionVisible: boolean;
  autopilot: boolean;
};

export function buildCognitiveCapabilitiesManifest(): CognitiveCapabilitiesManifest {
  const cognitive = process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true";
  return {
    brain: cognitive,
    graph: isCcosGraphPlatformEnabled(),
    twin: isCcosTwinPlatformEnabled(),
    evolutionVisible: isCcosEvolutionPlatformEnabled(),
    autopilot: MARKETPLACE_BRAIN_MATURITY === "L4_AUTOPILOT",
  };
}
