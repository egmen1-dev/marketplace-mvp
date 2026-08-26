import { isNeverAutoApprove } from "../evaluation-completeness";
import { requiresVisualObjectReview } from "../visual-object-review";
import type { StagingProductEvalRow } from "./evaluate-product";
import type { ShadowComparisonClass } from "./classify-comparison";

export type SafeAutoCandidateResult = {
  rawAllowCount: number;
  humanConfirmedSafeAllowCount: number;
  guardedAutoEligibleCount: number;
  guardedAutoEligiblePercent: number;
  neverAutoExcluded: number;
  visualReviewExcluded: number;
  humanDisagreementExcluded: number;
  incompleteDimensionsExcluded: number;
};

export function assessSafeAutoCandidates(input: {
  rows: StagingProductEvalRow[];
  comparisons?: Map<string, ShadowComparisonClass>;
  humanDecisions?: Map<string, string>;
}): SafeAutoCandidateResult {
  const realRows = input.rows.filter((r) => r.group !== "C_SYNTHETIC");
  let rawAllow = 0;
  let humanConfirmed = 0;
  let eligible = 0;
  let neverAutoExcluded = 0;
  let visualExcluded = 0;
  let humanDisagreement = 0;
  let incomplete = 0;

  for (const row of realRows) {
    if (row.policyDecision !== "ALLOW") continue;
    rawAllow++;

    const comparison = input.comparisons?.get(row.productId);
    const human = input.humanDecisions?.get(row.productId);
    const humanApprove = human === "APPROVE" || human === "APPROVED";

    if (human && humanApprove) humanConfirmed++;

    if (isNeverAutoApprove(row.rulesTriggered)) {
      neverAutoExcluded++;
      continue;
    }

    const visual = requiresVisualObjectReview({
      title: row.name,
      rulesTriggered: row.rulesTriggered,
    });
    if (visual.required) {
      visualExcluded++;
      continue;
    }

    if (comparison === "SYSTEM_LOOSER" || comparison === "POLICY_GAP") {
      humanDisagreement++;
      continue;
    }

    const completeness = row.evaluationCompleteness as { allRequiredEvaluated?: boolean };
    if (!completeness.allRequiredEvaluated || row.notEvaluatedDimensions.length > 0 || row.providerFailures) {
      incomplete++;
      continue;
    }

    if (row.conflicts.length > 0) continue;
    if (human && !humanApprove) continue;

    eligible++;
  }

  return {
    rawAllowCount: rawAllow,
    humanConfirmedSafeAllowCount: humanConfirmed,
    guardedAutoEligibleCount: eligible,
    guardedAutoEligiblePercent: realRows.length > 0 ? eligible / realRows.length : 0,
    neverAutoExcluded,
    visualReviewExcluded: visualExcluded,
    humanDisagreementExcluded: humanDisagreement,
    incompleteDimensionsExcluded: incomplete,
  };
}
