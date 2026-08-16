/** Marketplace binding for CCOS (EPIC 77 Wave 0). */
export function isMarketplaceCognitivePlatformEnabled(): boolean {
  return (
    process.env.CCOS_ENABLED === "true" &&
    process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true"
  );
}

export const GENOME_VERSION = "genome-v0";
export const MARKETPLACE_BRAIN_VERSION = "marketplace-brain-v0";
