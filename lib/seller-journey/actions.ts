"use server";

import { requireSellerSession } from "@/features/auth";

import { trackSellerNextActionClick } from "./analytics";
import { isSellerJourneyEnabled } from "./flags";
import { getSellerJourneyDashboard } from "./queries";

export type SellerJourneyActionState = {
  ok: boolean;
  error?: string;
};

export async function trackSellerJourneyCtaAction(): Promise<SellerJourneyActionState> {
  if (!isSellerJourneyEnabled()) {
    return { ok: false, error: "SELLER_JOURNEY_ENABLED=false" };
  }

  const seller = await requireSellerSession();
  const dashboard = await getSellerJourneyDashboard(seller.sellerProfileId);
  trackSellerNextActionClick({
    sellerProfileId: seller.sellerProfileId,
    step: dashboard.step,
  });

  return { ok: true };
}

export async function trackSellerJourneyViewAction(): Promise<SellerJourneyActionState> {
  if (!isSellerJourneyEnabled()) {
    return { ok: false, error: "SELLER_JOURNEY_ENABLED=false" };
  }

  const seller = await requireSellerSession();
  const { trackSellerJourneyView, trackSellerStepView } = await import("./analytics");
  trackSellerJourneyView(seller.sellerProfileId);
  const dashboard = await getSellerJourneyDashboard(seller.sellerProfileId);
  trackSellerStepView({
    sellerProfileId: seller.sellerProfileId,
    step: dashboard.step,
  });

  return { ok: true };
}
