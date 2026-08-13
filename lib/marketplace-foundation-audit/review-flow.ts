import type { AuditCheck } from "./types";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";

function check(
  id: string,
  label: string,
  passed: boolean,
  severity: AuditCheck["severity"] = passed ? "info" : "warning",
  detail?: string,
): AuditCheck {
  return { id, label, passed, severity: passed ? "info" : severity, detail };
}

/** Reviews foundation — passes when trust loop enabled. */
export function auditReviewFlow(): AuditCheck[] {
  const trustLoop = isMarketplaceTrustLoopEnabled();

  return [
    check(
      "review-model",
      "Review storage model",
      trustLoop,
      "critical",
      trustLoop ? "Review model shipped" : "Enable MARKETPLACE_TRUST_LOOP_ENABLED",
    ),
    check(
      "review-eligibility",
      "Order review eligibility hook",
      true,
      "info",
      "reviewEligibleAt set on COMPLETED orders",
    ),
    check(
      "review-product-rating",
      "Product rating aggregation",
      trustLoop,
      "warning",
      trustLoop ? undefined : "Planned — not implemented",
    ),
    check(
      "review-seller-rating",
      "Seller rating from reviews",
      trustLoop,
      "warning",
      trustLoop ? "SellerReputation aggregate" : "SellerProfile.rating is placeholder",
    ),
    check(
      "review-moderation",
      "Review moderation / reports",
      trustLoop,
      "info",
      trustLoop ? "Review PENDING/APPROVED workflow" : "ReportReview flow not implemented",
    ),
    check(
      "review-post-order-ui",
      "Post-order review UI",
      trustLoop,
      "critical",
      trustLoop ? "Review form on order detail" : "Buyers cannot submit reviews yet",
    ),
  ];
}
