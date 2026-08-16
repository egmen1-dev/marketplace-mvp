export type BrainMaturityLevel =
  | "L1_OBSERVER"
  | "L2_ADVISOR"
  | "L3_SIMULATOR"
  | "L4_AUTOPILOT";

export const CCOS_OBSERVATION_MATURITY: BrainMaturityLevel = "L1_OBSERVER";
export const MARKETPLACE_BRAIN_MATURITY: BrainMaturityLevel = "L2_ADVISOR";

export type BrainCapability = "observe" | "recommend" | "simulate" | "execute";

const CAPABILITIES: Record<BrainMaturityLevel, Set<BrainCapability>> = {
  L1_OBSERVER: new Set(["observe"]),
  L2_ADVISOR: new Set(["observe", "recommend"]),
  L3_SIMULATOR: new Set(["observe", "recommend", "simulate"]),
  L4_AUTOPILOT: new Set(["observe", "recommend", "simulate", "execute"]),
};

export function assertBrainCapability(
  level: BrainMaturityLevel,
  capability: BrainCapability,
): boolean {
  return CAPABILITIES[level].has(capability);
}

export function requireBrainCapability(
  level: BrainMaturityLevel,
  capability: BrainCapability,
): void {
  if (!assertBrainCapability(level, capability)) {
    throw new Error(`Brain ${level} cannot ${capability}`);
  }
}
