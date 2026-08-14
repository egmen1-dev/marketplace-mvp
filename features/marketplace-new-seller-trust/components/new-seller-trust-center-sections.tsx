"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { START_TRUST_EXPLANATION } from "@/lib/marketplace-new-seller-trust";
import type { NewSellerTrustSnapshot } from "@/lib/marketplace-new-seller-trust/types";

import { NewSellerStatusCard } from "./new-seller-status-card";
import { SellerCoachPanel } from "./seller-coach-panel";
import { TrustProgressPath } from "./trust-progress-path";
import { TrustTierBadge } from "./trust-tier-badge";

type NewSellerTrustCenterSectionsProps = {
  snapshot: NewSellerTrustSnapshot;
  sellerId: string;
};

export function NewSellerTrustCenterSections({
  snapshot,
  sellerId,
}: NewSellerTrustCenterSectionsProps) {
  useEffect(() => {
    if (snapshot.isNewSeller) {
      trackEvent({
        event: ANALYTICS_EVENTS.NEW_SELLER_STARTED,
        entityId: sellerId,
        route: "/account/reputation",
      });
    }
  }, [snapshot.isNewSeller, sellerId]);

  return (
    <div className="flex flex-col gap-6">
      <NewSellerStatusCard snapshot={snapshot} />
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">Начальный уровень доверия</p>
          <TrustTierBadge tier={snapshot.trustTier} />
        </div>
        <p className="mt-3 font-heading text-3xl font-semibold tabular-nums">
          {snapshot.trustScore}
          <span className="text-xl text-muted-foreground"> / 100</span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{START_TRUST_EXPLANATION}</p>
      </section>
      <TrustProgressPath steps={snapshot.progressSteps} />
      {snapshot.coach ? <SellerCoachPanel coach={snapshot.coach} /> : null}
    </div>
  );
}
