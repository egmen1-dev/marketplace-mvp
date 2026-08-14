"use client";

import { useEffect } from "react";

import { CheckCircle2 } from "lucide-react";

import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { BuyerNewSellerSnapshot } from "@/lib/marketplace-new-seller-trust/types";
import { NEW_SELLER_HISTORY_NOTE } from "@/lib/marketplace-new-seller-trust";
import { TrustTierBadge } from "@/features/marketplace-new-seller-trust";

import { TrustConversionViewTracker } from "./trust-conversion-trackers";

type PdpNewSellerTrustOrderedProps = {
  snapshot: BuyerNewSellerSnapshot;
  productId: string;
  joinedLabel?: string;
};

/** New seller trust blocks in spec order: protection → status → path. */
export function PdpNewSellerTrustOrdered({
  snapshot,
  productId,
  joinedLabel,
}: PdpNewSellerTrustOrderedProps) {
  useEffect(() => {
    if (snapshot.isNewSeller) {
      trackEvent({
        event: ANALYTICS_EVENTS.BUYER_NEW_SELLER_PURCHASE,
        entityId: productId,
        route: `/product/${productId}`,
      });
    }
  }, [snapshot.isNewSeller, productId]);

  if (!snapshot.isNewSeller) return null;

  return (
    <div className="flex flex-col gap-4" data-testid="pdp-new-seller-trust-ordered">
      <TrustConversionViewTracker
        event={ANALYTICS_EVENTS.NEW_SELLER_TRUST_VIEW}
        entityId={productId}
        route={`/product/${productId}`}
        markTrustViewed
      />

      {snapshot.protectionLines.length > 0 ? (
        <section
          className="rounded-2xl border border-primary/20 bg-primary/5 p-4"
          data-testid="pdp-buyer-protection"
        >
          <p className="font-medium">Покупка защищена</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {snapshot.protectionLines.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{line.replace(/^✓\s*/, "")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4" data-testid="pdp-new-seller-status">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">Новый продавец</p>
          <TrustTierBadge tier={snapshot.trustTier} />
        </div>
        {joinedLabel ? (
          <p className="mt-2 text-sm text-muted-foreground">Аккаунт создан: {joinedLabel}</p>
        ) : null}
        <p className="mt-1 text-sm text-muted-foreground">{NEW_SELLER_HISTORY_NOTE}</p>
      </section>

      {snapshot.showFirstBuyerExperience ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="font-medium">Путь доверия</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {snapshot.firstBuyerLines.map((line) => (
              <li key={line} className="flex items-start gap-2">
                {line.startsWith("✓") ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                ) : null}
                <span>{line.replace(/^✓\s*/, "")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
