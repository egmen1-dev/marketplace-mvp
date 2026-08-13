"use server";

import { requireSellerSession } from "@/features/auth";

import {
  trackSellerActionClick,
  trackSellerAiSummaryView,
  trackSellerBusinessView,
  trackSellerMoneyExplanationView,
  trackSellerNextActionView,
  trackSellerProblemView,
} from "./analytics";
import { isSellerBusinessIntelligenceEnabled } from "./flags";

export type SellerBusinessActionState = { ok: boolean; error?: string };

export async function trackBusinessViewAction(): Promise<SellerBusinessActionState> {
  if (!isSellerBusinessIntelligenceEnabled()) {
    return { ok: false, error: "SELLER_BUSINESS_INTELLIGENCE_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerBusinessView(seller.sellerProfileId);
  trackSellerAiSummaryView(seller.sellerProfileId);
  return { ok: true };
}

export async function trackNextActionViewAction(
  actionId: string,
): Promise<SellerBusinessActionState> {
  if (!isSellerBusinessIntelligenceEnabled()) {
    return { ok: false, error: "SELLER_BUSINESS_INTELLIGENCE_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerNextActionView({
    sellerProfileId: seller.sellerProfileId,
    actionId,
  });
  return { ok: true };
}

export async function trackActionClickAction(
  actionId: string,
): Promise<SellerBusinessActionState> {
  if (!isSellerBusinessIntelligenceEnabled()) {
    return { ok: false, error: "SELLER_BUSINESS_INTELLIGENCE_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerActionClick({
    sellerProfileId: seller.sellerProfileId,
    actionId,
  });
  return { ok: true };
}

export async function trackProblemViewAction(
  problemId: string,
): Promise<SellerBusinessActionState> {
  if (!isSellerBusinessIntelligenceEnabled()) {
    return { ok: false, error: "SELLER_BUSINESS_INTELLIGENCE_ENABLED=false" };
  }
  trackSellerProblemView(problemId);
  return { ok: true };
}

export async function trackMoneyExplanationViewAction(): Promise<SellerBusinessActionState> {
  if (!isSellerBusinessIntelligenceEnabled()) {
    return { ok: false, error: "SELLER_BUSINESS_INTELLIGENCE_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerMoneyExplanationView(seller.sellerProfileId);
  return { ok: true };
}
