/** Reviewer versioning — reproducible reports */

export const REVIEW_RULES_VERSION = "1.0.0";
export const DESIGN_SYSTEM_VERSION = "1.0.0";
export const BASELINE_MANIFEST_VERSION = "1.0.0";

export type ReviewVersionContext = {
  reviewRulesVersion: string;
  designSystemVersion: string;
  baselineVersion: string | null;
  providerVersion: string | null;
};

export function buildVersionContext(
  baselineVersion: string | null = null,
  providerVersion: string | null = null,
): ReviewVersionContext {
  return {
    reviewRulesVersion: REVIEW_RULES_VERSION,
    designSystemVersion: DESIGN_SYSTEM_VERSION,
    baselineVersion,
    providerVersion,
  };
}
