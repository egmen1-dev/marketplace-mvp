/** Lab uses the same advisory flag — never touches live search sort. */
export function isRankingLabEnabled(): boolean {
  return process.env.MARKETPLACE_RANKING_INTELLIGENCE_ENABLED === "true";
}
