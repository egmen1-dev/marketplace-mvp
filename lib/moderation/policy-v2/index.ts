export { evaluateLotPolicyV2 } from "./evaluate";
export { loadLotPolicyV2Registry, clearLotPolicyV2Cache } from "./load-registry";
export {
  automationVerdict,
  canAutoApprove,
  mapPolicyV2ToModerationDecision,
} from "./safe-auto-approval";
export { normalizePolicyText, matchPatterns, detectAccessoryContext, shouldTreatXxxAsAdultContent, detectDrillChuckContext, detectAmbiguousPatronContext } from "./text-engine";
export {
  LOT_POLICY_V2,
  LOT_POLICY_V2_EFFECTIVE_FROM,
  type PolicyDecisionClass,
  type PolicyEvaluationInput,
  type PolicyEvaluationResult,
  type LotPolicyV2Registry,
} from "./types";
