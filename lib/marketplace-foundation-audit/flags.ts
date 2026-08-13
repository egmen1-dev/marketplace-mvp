/** Default OFF — marketplace foundation readiness audit dashboards. */
export function isMarketplaceFoundationAuditEnabled(): boolean {
  return process.env.MARKETPLACE_FOUNDATION_AUDIT_ENABLED === "true";
}
