import type { BrainMaturityLevel } from "@/lib/ccos/governance/maturity";
import { MARKETPLACE_BRAIN_MATURITY } from "@/lib/ccos/governance/maturity";

/** Marketplace binding for CCOS (EPIC 77 Wave 0+). */
export function isMarketplaceCognitivePlatformEnabled(): boolean {
  return (
    process.env.CCOS_ENABLED === "true" &&
    process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true"
  );
}

export type MarketplaceBrainLevel = "advisor" | "simulator";

export function resolveMarketplaceBrainLevel(): MarketplaceBrainLevel {
  const raw = process.env.MARKETPLACE_BRAIN_LEVEL?.toLowerCase();
  if (raw === "simulator" || raw === "l3") return "simulator";
  return "advisor";
}

export function resolveMarketplaceBrainMaturity(): BrainMaturityLevel {
  if (resolveMarketplaceBrainLevel() === "simulator") {
    return "L3_SIMULATOR";
  }
  return MARKETPLACE_BRAIN_MATURITY;
}

export const GENOME_VERSION = "genome-v0";
export const MARKETPLACE_BRAIN_VERSION = "marketplace-brain-v1";
