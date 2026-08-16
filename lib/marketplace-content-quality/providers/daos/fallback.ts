import type { ProductQualityEvaluation } from "../../types";
import { RuleBasedFallbackProvider } from "../rule-based-fallback";

/** Safe merge when DAOS visual critics fail — marketplace-owned critics still run. */
export async function evaluateWithDaosFallback(
  fallback: RuleBasedFallbackProvider,
  mergedInput: Parameters<RuleBasedFallbackProvider["evaluateProduct"]>[0],
  daosUsed: boolean,
): Promise<ProductQualityEvaluation> {
  const evaluation = await fallback.evaluateProduct(mergedInput);
  return {
    ...evaluation,
    daosUsed,
    fallbackUsed: !daosUsed,
    provider: daosUsed ? "daos+rule-based-fallback" : evaluation.provider,
  };
}
