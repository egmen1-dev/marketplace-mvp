import type { RiskSeverity } from "@prisma/client";

/**
 * Centralized trust/risk configuration (AGENT-019). Thresholds, rule effects and
 * the enforcement flag live here — never hardcoded across the project.
 */

/** Risk level thresholds (section 12). Score 0..100. */
export const RISK_LEVEL_THRESHOLDS = {
  LOW: 0, // 0..24
  MEDIUM: 25, // 25..49
  HIGH: 50, // 50..74
  CRITICAL: 75, // 75..100
} as const;

/** Map a 0..100 risk score to a severity level. */
export function riskLevel(score: number): RiskSeverity {
  const s = Math.max(0, Math.min(100, score));
  if (s >= RISK_LEVEL_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (s >= RISK_LEVEL_THRESHOLDS.HIGH) return "HIGH";
  if (s >= RISK_LEVEL_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

/** Rule effects (section 11). Analysis-first defaults. */
export type RuleEffect =
  | "LOG_ONLY"
  | "RAISE_RISK"
  | "ADMIN_REVIEW"
  | "LIMIT_ACTION"
  | "TEMPORARY_HOLD"
  | "BLOCK_ACTION";

/** Effects that would restrict a user action (gated by the enforcement flag). */
export const ENFORCING_EFFECTS: RuleEffect[] = [
  "LIMIT_ACTION",
  "TEMPORARY_HOLD",
  "BLOCK_ACTION",
];

/**
 * Global enforcement flag (section 56/57). Default OFF: the platform analyzes and
 * recommends, but never automatically restricts real user actions. Enforcing
 * effects are downgraded to ADMIN_REVIEW unless this is explicitly enabled.
 */
export function isEnforcementEnabled(): boolean {
  return process.env.RISK_ENFORCEMENT_ENABLED === "true";
}

/** Resolve an effect against the enforcement flag (downgrade when disabled). */
export function resolveEffect(effect: RuleEffect): RuleEffect {
  if (ENFORCING_EFFECTS.includes(effect) && !isEnforcementEnabled()) {
    return "ADMIN_REVIEW";
  }
  return effect;
}

/** Neutral operational score for unknown entities (new users/sellers). */
export const NEUTRAL_TRUST = 50;

/** Ranking risk-penalty caps (section 36/37). Applied to organicScore (0..1). */
export const RANKING_RISK_PENALTY = {
  LOW: 0,
  MEDIUM: 0.03,
  HIGH: 0.1,
  /** CRITICAL exclusion only when policy explicitly enables enforcement. */
  CRITICAL: 0.2,
  /** Absolute cap so risk can never dominate ranking. */
  MAX: 0.25,
} as const;

/** Minimum detector confidence to raise risk (below → LOG_ONLY, section 40). */
export const MIN_CONFIDENCE_TO_RAISE = 40;
