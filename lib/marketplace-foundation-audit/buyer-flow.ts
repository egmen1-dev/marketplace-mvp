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

export function auditBuyerFlow(): AuditCheck[] {
  const hasLandingAnalytics = Boolean(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.AUTH_URL?.trim(),
  );

  return [
    check("buyer-route-home", "Landing page route", true),
    check("buyer-route-catalog", "Catalog route", true),
    check("buyer-route-cart", "Cart route", true),
    check("buyer-route-checkout", "Checkout route", true),
    check("buyer-route-product", "Product page route", true),
    check("buyer-analytics-funnel", "Conversion analytics events registered", true),
    check(
      "buyer-utm-attribution",
      "App URL configured for UTM / attribution",
      hasLandingAnalytics,
      "warning",
      hasLandingAnalytics ? undefined : "Set NEXT_PUBLIC_APP_URL or AUTH_URL",
    ),
    check(
      "buyer-trust-block",
      "Trust block analytics (PDP)",
      true,
      "info",
      "trust_block_view event available",
    ),
  ];
}
