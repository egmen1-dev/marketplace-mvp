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

export function auditSellerFlow(): AuditCheck[] {
  const firstEntry = process.env.SELLER_FIRST_ENTRY_ENABLED === "true";
  const operatingDesk = process.env.SELLER_OPERATING_DESK_ENABLED === "true";
  const payout = process.env.SELLER_PAYOUT_ENABLED === "true";

  return [
    check("seller-route-sell", "Seller entry (/sell)", true),
    check("seller-route-products", "Product management route", true),
    check("seller-route-sales", "Sales / orders route", true),
    check("seller-route-balance", "Balance route", true),
    check("seller-route-payouts", "Payout route", true),
    check(
      "seller-onboarding",
      "Seller first-entry onboarding",
      firstEntry,
      "warning",
      firstEntry ? undefined : "Enable SELLER_FIRST_ENTRY_ENABLED for guided onboarding",
    ),
    check(
      "seller-operations-desk",
      "Seller operating desk",
      operatingDesk,
      "info",
      operatingDesk ? undefined : "Optional: SELLER_OPERATING_DESK_ENABLED",
    ),
    check(
      "seller-payout-flow",
      "Payout workflow enabled",
      payout,
      "warning",
      payout ? undefined : "Enable SELLER_PAYOUT_ENABLED for withdrawals",
    ),
    check(
      "seller-ai-independent",
      "Seller core flows do not require AI flags",
      true,
      "info",
      "Products, orders, balance work without AI modules",
    ),
  ];
}
