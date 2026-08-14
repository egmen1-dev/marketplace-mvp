import { pctRate } from "@/lib/analytics/funnel-metrics";

import type { TrustImpactSnapshot } from "./types";

type VisitorEventRow = {
  event: string;
  visitorId: string | null;
  entityId: string | null;
};

export function computeTrustImpactFromEvents(input: {
  rows: VisitorEventRow[];
  windowDays: number;
}): TrustImpactSnapshot {
  const productViewers = new Set<string>();
  const trustViewers = new Set<string>();
  const cartFromTrust = new Set<string>();
  const cartWithoutTrust = new Set<string>();
  const purchaseFromTrust = new Set<string>();
  const purchaseWithoutTrust = new Set<string>();

  const eventsByVisitor = new Map<string, VisitorEventRow[]>();
  for (const row of input.rows) {
    if (!row.visitorId) continue;
    const list = eventsByVisitor.get(row.visitorId) ?? [];
    list.push(row);
    eventsByVisitor.set(row.visitorId, list);
  }

  for (const [visitorId, events] of eventsByVisitor) {
    const hasProductView = events.some((e) => e.event === "product_view");
    if (!hasProductView) continue;

    productViewers.add(visitorId);

    const sawTrust = events.some(
      (e) =>
        e.event === "trust_block_view" ||
        e.event === "new_seller_trust_view" ||
        e.event === "trust_details_open",
    );

    if (sawTrust) trustViewers.add(visitorId);

    const addedToCart = events.some((e) => e.event === "add_to_cart");
    const purchased = events.some((e) => e.event === "purchase_complete");

    if (addedToCart) {
      if (sawTrust) cartFromTrust.add(visitorId);
      else cartWithoutTrust.add(visitorId);
    }

    if (purchased) {
      if (sawTrust) purchaseFromTrust.add(visitorId);
      else purchaseWithoutTrust.add(visitorId);
    }
  }

  const withViews = trustViewers.size;
  const withoutViews = Math.max(0, productViewers.size - trustViewers.size);

  return {
    enabled: true,
    windowDays: input.windowDays,
    withTrustBlock: {
      views: withViews,
      cartAdds: cartFromTrust.size,
      purchases: purchaseFromTrust.size,
      viewToCartRate: pctRate(cartFromTrust.size, withViews),
      viewToPurchaseRate: pctRate(purchaseFromTrust.size, withViews),
    },
    withoutTrustBlock: {
      views: withoutViews,
      cartAdds: cartWithoutTrust.size,
      purchases: purchaseWithoutTrust.size,
      viewToCartRate: pctRate(cartWithoutTrust.size, withoutViews),
      viewToPurchaseRate: pctRate(purchaseWithoutTrust.size, withoutViews),
    },
  };
}
