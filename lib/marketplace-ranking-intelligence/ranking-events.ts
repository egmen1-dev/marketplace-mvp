/** Ranking intelligence domain events (internal, not catalog events). */
export const RANKING_EVENTS = {
  RECALCULATED: "ranking.recalculated",
  ELIGIBILITY_FAILED: "ranking.eligibility_failed",
  QUALITY_GATE_BLOCKED: "ranking.quality_gate_blocked",
  EXPERIMENT_COMPLETED: "ranking.experiment_completed",
  VERSION_ACTIVATED: "ranking.version_activated",
} as const;

export type RankingEventName = (typeof RANKING_EVENTS)[keyof typeof RANKING_EVENTS];
