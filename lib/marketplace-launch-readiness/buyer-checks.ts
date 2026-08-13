import { isMarketplaceDeliveryEnabled } from "@/lib/marketplace-delivery/flags";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";

import { launchCheck } from "./audit";

export function auditBuyerJourney(): import("./types").LaunchAuditCheck[] {
  const hasAppUrl = Boolean(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.AUTH_URL?.trim(),
  );

  return [
    launchCheck("buyer-landing", "Landing page route", true),
    launchCheck("buyer-search", "Catalog search route", true),
    launchCheck("buyer-category", "Category browsing", true),
    launchCheck("buyer-product", "Product page (PDP)", true),
    launchCheck("buyer-cart", "Cart route", true),
    launchCheck("buyer-checkout", "Checkout route", true),
    launchCheck("buyer-orders", "Order history route", true),
    launchCheck(
      "buyer-delivery-ux",
      "Delivery progress on order detail",
      isMarketplaceDeliveryEnabled(),
      "warning",
      isMarketplaceDeliveryEnabled()
        ? undefined
        : "Enable MARKETPLACE_DELIVERY_ENABLED",
    ),
    launchCheck(
      "buyer-review-ux",
      "Post-delivery review form",
      isMarketplaceTrustLoopEnabled(),
      "warning",
      isMarketplaceTrustLoopEnabled()
        ? undefined
        : "Enable MARKETPLACE_TRUST_LOOP_ENABLED",
    ),
    launchCheck(
      "buyer-trust-blocks",
      "Trust signals on PDP",
      isMarketplaceTrustLoopEnabled(),
      "info",
    ),
    launchCheck(
      "buyer-attribution",
      "App URL for checkout redirects",
      hasAppUrl,
      "warning",
      hasAppUrl ? undefined : "Set NEXT_PUBLIC_APP_URL",
    ),
    launchCheck(
      "buyer-mobile-layout",
      "Responsive cabinet + checkout layouts",
      true,
      "info",
      "Tailwind responsive breakpoints in place",
    ),
  ];
}
