"use server";

import { requireSellerSession } from "@/features/auth";

import {
  trackSellerOperatingDeskActionClick,
  trackSellerOperatingDeskIssueClick,
  trackSellerOperatingDeskView,
} from "./analytics";
import { isSellerOperatingDeskEnabled } from "./flags";

export type SellerOperatingDeskActionState = {
  ok: boolean;
  error?: string;
};

export async function trackOperatingDeskViewAction(): Promise<SellerOperatingDeskActionState> {
  if (!isSellerOperatingDeskEnabled()) {
    return { ok: false, error: "SELLER_OPERATING_DESK_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerOperatingDeskView(seller.sellerProfileId);
  return { ok: true };
}

export async function trackOperatingDeskIssueClickAction(
  issueId: string,
): Promise<SellerOperatingDeskActionState> {
  if (!isSellerOperatingDeskEnabled()) {
    return { ok: false, error: "SELLER_OPERATING_DESK_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerOperatingDeskIssueClick({
    sellerProfileId: seller.sellerProfileId,
    issueId,
  });
  return { ok: true };
}

export async function trackOperatingDeskActionClickAction(
  actionId: string,
): Promise<SellerOperatingDeskActionState> {
  if (!isSellerOperatingDeskEnabled()) {
    return { ok: false, error: "SELLER_OPERATING_DESK_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerOperatingDeskActionClick({
    sellerProfileId: seller.sellerProfileId,
    actionId,
  });
  return { ok: true };
}
