/** MARKETPLACE-RANKING-INTELLIGENCE-001 — default OFF; intelligence layer only. */
export function isMarketplaceRankingIntelligenceEnabled(): boolean {
  return process.env.MARKETPLACE_RANKING_INTELLIGENCE_ENABLED === "true";
}
