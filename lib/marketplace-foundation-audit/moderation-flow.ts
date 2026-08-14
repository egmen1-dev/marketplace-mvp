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

export function auditModerationFlow(): AuditCheck[] {
  const trustLoop = isMarketplaceTrustLoopEnabled();

  return [
    check(
      "moderation-admin-products",
      "Admin product moderation UI",
      trustLoop,
      "warning",
      trustLoop ? "/admin/moderation queue" : "Legacy admin product actions only",
    ),
    check("moderation-hide-activate", "Hide / activate product actions", true),
    check("moderation-admin-log", "Admin action audit log", true),
    check(
      "moderation-status-enum",
      "ModerationStatus workflow (PENDING/APPROVED/REJECTED)",
      trustLoop,
      "warning",
      trustLoop
        ? "ProductModeration + ModerationQueueItem"
        : "Products use DRAFT/ACTIVE/ARCHIVED — no pre-publish queue",
    ),
    check(
      "moderation-auto-rules",
      "Automated prohibited-item detection",
      trustLoop,
      "info",
      trustLoop ? "Rule-based prohibited product checks" : "Manual moderation only",
    ),
    check(
      "moderation-empty-cards",
      "Empty card detection",
      true,
      "info",
      "Product completeness scoring available",
    ),
  ];
}
