import type { AuditCheck } from "./types";

function check(
  id: string,
  label: string,
  passed: boolean,
  severity: AuditCheck["severity"] = passed ? "info" : "warning",
  detail?: string,
): AuditCheck {
  return { id, label, passed, severity: passed ? "info" : severity, detail };
}

/** Reviews foundation is not shipped — audit detects eligibility plumbing only. */
export function auditReviewFlow(): AuditCheck[] {
  return [
    check(
      "review-model",
      "Review storage model",
      false,
      "critical",
      "Review model not in schema — foundation gap",
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
      false,
      "warning",
      "Planned — not implemented",
    ),
    check(
      "review-seller-rating",
      "Seller rating from reviews",
      false,
      "warning",
      "SellerProfile.rating is placeholder",
    ),
    check(
      "review-moderation",
      "Review moderation / reports",
      false,
      "warning",
      "ReportReview flow not implemented",
    ),
    check(
      "review-post-order-ui",
      "Post-order review UI",
      false,
      "critical",
      "Buyers cannot submit reviews yet",
    ),
  ];
}
