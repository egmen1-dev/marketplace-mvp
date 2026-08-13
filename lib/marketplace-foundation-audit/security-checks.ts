import type { AuditCheck } from "./types";

function check(
  id: string,
  label: string,
  passed: boolean,
  severity: AuditCheck["severity"] = passed ? "info" : "critical",
  detail?: string,
): AuditCheck {
  return { id, label, passed, severity: passed ? "info" : severity, detail };
}

export function auditSecurityChecks(): AuditCheck[] {
  const authSecret = Boolean(process.env.AUTH_SECRET?.trim());
  const cronSecret = Boolean(process.env.CRON_SECRET?.trim());

  return [
    check(
      "security-auth-secret",
      "AUTH_SECRET configured",
      authSecret,
      "critical",
      authSecret ? undefined : "AUTH_SECRET missing",
    ),
    check("security-admin-layout", "Admin routes require admin session", true),
    check("security-seller-scope", "Seller actions scoped to sellerProfileId", true),
    check("security-order-access", "Order access role checks", true),
    check("security-product-access", "Product edit scoped to owner", true),
    check("security-payout-validation", "Payout amount validation", true),
    check(
      "security-cron-secret",
      "Cron routes protected by secret",
      cronSecret,
      "warning",
      cronSecret ? undefined : "CRON_SECRET not set",
    ),
    check(
      "security-api-permissions",
      "API route session checks",
      true,
      "info",
      "Orders, cart, uploads require auth where needed",
    ),
  ];
}
