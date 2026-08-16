import { isCcosEvolutionPlatformEnabled } from "./flags";

export class EvolutionPlatformDisabledError extends Error {
  constructor(message = "CCOS Evolution Platform is disabled") {
    super(message);
    this.name = "EvolutionPlatformDisabledError";
  }
}

export function assertEvolutionPlatformEnabled(): void {
  if (!isCcosEvolutionPlatformEnabled()) {
    throw new EvolutionPlatformDisabledError();
  }
}

/** Wave 6 — no automatic rollback execution */
export function assertNoAutomaticRollback(actor: string): void {
  if (actor === "system" || actor === "ai" || actor === "learning-engine") {
    throw new Error("Automatic rollback forbidden on Wave 6 — human approval required");
  }
}

/** Wave 6 — no AI as reviewer */
export function assertHumanReviewer(reviewedBy: string): void {
  if (reviewedBy === "ai" || reviewedBy === "learning-engine" || reviewedBy === "system") {
    throw new Error("AI cannot approve or reject brain candidates");
  }
}

/** Evolution must not touch live ranking */
export const EVOLUTION_RANKING_ISOLATION = {
  resolveOrderByUntouched: true,
  liveSearchSortImmutable: true,
} as const;

/** Finance / moderation isolation markers for audit */
export const EVOLUTION_HARD_ISOLATION = {
  finance: ["wallet", "payout", "payment", "promotion_purchase", "commissions"],
  moderation: ["enforcement_policy_auto_change"],
  ranking: ["resolveOrderBy", "production_search_sort"],
} as const;
