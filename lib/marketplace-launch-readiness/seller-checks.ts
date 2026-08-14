import { isMarketplaceDeliveryEnabled } from "@/lib/marketplace-delivery/flags";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";
import { isSellerFirstEntryEnabled } from "@/lib/seller-first-entry/flags";
import { isSellerPayoutEnabled } from "@/lib/seller-payout/flags";

import { launchCheck } from "./audit";

export function auditSellerJourney(): import("./types").LaunchAuditCheck[] {
  return [
    launchCheck(
      "seller-first-entry",
      "Seller first-entry onboarding",
      isSellerFirstEntryEnabled(),
      "warning",
      isSellerFirstEntryEnabled() ? undefined : "Enable SELLER_FIRST_ENTRY_ENABLED",
    ),
    launchCheck("seller-product-create", "Product creation route", true),
    launchCheck(
      "seller-moderation",
      "Pre-publish moderation gate",
      isMarketplaceTrustLoopEnabled(),
      "warning",
      isMarketplaceTrustLoopEnabled()
        ? "Product moderation preview on edit"
        : "Enable MARKETPLACE_TRUST_LOOP_ENABLED",
    ),
    launchCheck("seller-sales", "Incoming orders (sales) route", true),
    launchCheck(
      "seller-ship-queue",
      "Ship queue for paid orders",
      isMarketplaceDeliveryEnabled(),
      "warning",
      isMarketplaceDeliveryEnabled()
        ? "/account/orders/ship"
        : "Enable MARKETPLACE_DELIVERY_ENABLED",
    ),
    launchCheck("seller-balance", "Seller balance route", true),
    launchCheck(
      "seller-payout",
      "Payout withdrawal flow",
      isSellerPayoutEnabled(),
      "warning",
      isSellerPayoutEnabled() ? undefined : "Enable SELLER_PAYOUT_ENABLED",
    ),
    launchCheck(
      "seller-reputation",
      "Seller reputation page",
      isMarketplaceTrustLoopEnabled(),
      "info",
    ),
    launchCheck(
      "seller-next-step",
      "Empty states with next-step guidance",
      isSellerFirstEntryEnabled(),
      "info",
    ),
  ];
}
