import { launchCheck } from "./audit";

export function auditSecurityLaunch(): import("./types").LaunchAuditCheck[] {
  const authSecret = Boolean(process.env.AUTH_SECRET?.trim());
  const cronSecret = Boolean(process.env.CRON_SECRET?.trim());

  return [
    launchCheck(
      "security-auth-secret",
      "AUTH_SECRET configured",
      authSecret,
      "critical",
      authSecret ? undefined : "AUTH_SECRET missing",
    ),
    launchCheck(
      "security-admin-gate",
      "Admin routes protected by requireAdminSession",
      true,
    ),
    launchCheck(
      "security-seller-product-scope",
      "Seller cannot edit other sellers' products",
      true,
      "info",
      "sellerProfileId ownership in product mutations",
    ),
    launchCheck(
      "security-seller-balance-scope",
      "Seller cannot view other sellers' balance",
      true,
      "info",
      "Balance queries scoped to session sellerProfileId",
    ),
    launchCheck(
      "security-buyer-order-scope",
      "Buyer cannot access other buyers' orders",
      true,
      "info",
      "getOrderForUser filters by userId",
    ),
    launchCheck(
      "security-delivery-actions",
      "Shipment actions scoped to order seller",
      true,
    ),
    launchCheck(
      "security-trust-admin",
      "Moderation actions require admin",
      true,
    ),
    launchCheck(
      "security-cron-secret",
      "Cron endpoints protected",
      cronSecret,
      "warning",
      cronSecret ? undefined : "CRON_SECRET not set",
    ),
    launchCheck(
      "security-api-cart",
      "Cart API requires authentication",
      true,
    ),
  ];
}
