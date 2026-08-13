import {
  adEligibilityFixChecklist,
  buildProductAdSnapshot,
  type ProductAdSnapshotSource,
} from "@/lib/product-advertising";
import type { PromotionReadiness } from "@/lib/promotion/types";

/** Minimum card quality to start promotion (aligns with ad-readiness guidance). */
export const PROMOTION_MIN_QUALITY_SCORE = 50;

/**
 * Maps ad eligibility + quality into seller-facing promotion readiness.
 * Reuses ADS readiness — does not duplicate catalog rules.
 */
export function evaluatePromotionReadiness(
  source: ProductAdSnapshotSource,
): PromotionReadiness {
  const snapshot = buildProductAdSnapshot(source);
  const blockers = adEligibilityFixChecklist(snapshot.eligibility.reasons);

  if (
    source.requiredCharacteristicCount != null &&
    source.requiredCharacteristicCount > 0 &&
    (source.filledRequiredCharacteristicCount ?? 0) <
      source.requiredCharacteristicCount
  ) {
    if (!blockers.includes("Заполните обязательные характеристики")) {
      blockers.push("Заполните обязательные характеристики");
    }
  }

  const ready =
    snapshot.eligibility.eligible &&
    snapshot.quality.score >= PROMOTION_MIN_QUALITY_SCORE &&
    blockers.length === 0;

  return {
    ready,
    reasons: snapshot.eligibility.reasons,
    blockers,
    qualityScore: snapshot.quality.score,
  };
}
