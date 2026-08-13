/** Default OFF — paid promotion checkout (Stripe). Free MVP start when false. */
export function isPromotionBillingEnabled(): boolean {
  return process.env.PROMOTION_BILLING_ENABLED === "true";
}
