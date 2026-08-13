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

export function auditModerationFlow(): AuditCheck[] {
  return [
    check("moderation-admin-products", "Admin product moderation UI", true),
    check("moderation-hide-activate", "Hide / activate product actions", true),
    check("moderation-admin-log", "Admin action audit log", true),
    check(
      "moderation-status-enum",
      "ModerationStatus workflow (PENDING/APPROVED/REJECTED)",
      false,
      "warning",
      "Products use DRAFT/ACTIVE/ARCHIVED — no pre-publish queue",
    ),
    check(
      "moderation-auto-rules",
      "Automated prohibited-item detection",
      false,
      "info",
      "Manual moderation only",
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
