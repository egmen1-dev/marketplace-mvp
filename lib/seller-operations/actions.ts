"use server";

import { requireSellerSession } from "@/features/auth";

import {
  trackSellerAiAdviceClick,
  trackSellerOperationsView,
  trackSellerPriorityClick,
  trackSellerTaskOpen,
} from "./analytics";
import { isSellerOperationsEnabled } from "./flags";

export type SellerOperationsActionState = { ok: boolean; error?: string };

export async function trackOperationsViewAction(): Promise<SellerOperationsActionState> {
  if (!isSellerOperationsEnabled()) {
    return { ok: false, error: "SELLER_OPERATIONS_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerOperationsView(seller.sellerProfileId);
  return { ok: true };
}

export async function trackPriorityClickAction(
  priorityId: string,
): Promise<SellerOperationsActionState> {
  if (!isSellerOperationsEnabled()) {
    return { ok: false, error: "SELLER_OPERATIONS_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerPriorityClick({
    sellerProfileId: seller.sellerProfileId,
    priorityId,
  });
  trackSellerTaskOpen({
    sellerProfileId: seller.sellerProfileId,
    taskId: priorityId,
  });
  return { ok: true };
}

export async function trackAiAdviceClickAction(): Promise<SellerOperationsActionState> {
  if (!isSellerOperationsEnabled()) {
    return { ok: false, error: "SELLER_OPERATIONS_ENABLED=false" };
  }
  const seller = await requireSellerSession();
  trackSellerAiAdviceClick(seller.sellerProfileId);
  return { ok: true };
}
