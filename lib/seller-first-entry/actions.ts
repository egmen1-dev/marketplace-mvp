"use server";

import { revalidatePath } from "next/cache";

import { requireSellerSession } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

import {
  trackSellerGuideActionClick,
  trackSellerOnboardingStarted,
} from "./analytics";
import { isSellerFirstEntryEnabled } from "./flags";
import {
  dismissSellerWelcome,
  getSellerFirstEntryDashboard,
  startSellerFirstExperience,
} from "./queries";

export type SellerFirstEntryActionState = {
  ok: boolean;
  error?: string;
};

export async function startSellerOnboardingAction(): Promise<SellerFirstEntryActionState> {
  if (!isSellerFirstEntryEnabled()) {
    return { ok: false, error: "SELLER_FIRST_ENTRY_ENABLED=false" };
  }

  const seller = await requireSellerSession();
  await startSellerFirstExperience(seller.sellerProfileId);
  trackSellerOnboardingStarted(seller.sellerProfileId);

  revalidatePath(ROUTES.ACCOUNT_SELLER_START);
  return { ok: true };
}

export async function dismissSellerWelcomeAction(): Promise<SellerFirstEntryActionState> {
  if (!isSellerFirstEntryEnabled()) {
    return { ok: false, error: "SELLER_FIRST_ENTRY_ENABLED=false" };
  }

  const seller = await requireSellerSession();
  await dismissSellerWelcome(seller.sellerProfileId);
  revalidatePath(ROUTES.ACCOUNT_SELLER_START);
  return { ok: true };
}

export async function trackGuideCtaAction(): Promise<SellerFirstEntryActionState> {
  if (!isSellerFirstEntryEnabled()) {
    return { ok: false, error: "SELLER_FIRST_ENTRY_ENABLED=false" };
  }

  const seller = await requireSellerSession();
  const dashboard = await getSellerFirstEntryDashboard(seller.sellerProfileId);
  trackSellerGuideActionClick({
    sellerProfileId: seller.sellerProfileId,
    step: dashboard.step,
  });
  return { ok: true };
}
