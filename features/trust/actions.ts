"use server";

import type { DisputeReason } from "@prisma/client";

import { requireAdminSession, requireUserSession } from "@/features/auth";
import {
  confirmBuyerOrder,
  openBuyerDispute,
  resolveDisputeForBuyer,
  resolveDisputeForSeller,
  TrustError,
} from "@/lib/trust";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";

export type TrustActionResult =
  | { ok: true }
  | { ok: false; error: string };

function mapError(err: unknown): TrustActionResult {
  if (err instanceof TrustError) {
    return { ok: false, error: err.message };
  }
  console.error("[trust-action]", err);
  return { ok: false, error: "Не удалось выполнить действие" };
}

export async function buyerConfirmOrderAction(
  orderId: string,
): Promise<TrustActionResult> {
  try {
    const user = await requireUserSession();
    await confirmBuyerOrder(orderId, user.id);
    revalidatePath(`${ROUTES.ORDERS}/${orderId}`);
    revalidatePath(ROUTES.ACCOUNT_SALES);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function buyerReportIssueAction(input: {
  orderId: string;
  reason: DisputeReason;
  description?: string;
}): Promise<TrustActionResult> {
  try {
    const user = await requireUserSession();
    await openBuyerDispute({
      orderId: input.orderId,
      buyerUserId: user.id,
      reason: input.reason,
      description: input.description,
    });
    revalidatePath(`${ROUTES.ORDERS}/${input.orderId}`);
    revalidatePath(ROUTES.ADMIN_DISPUTES);
    revalidatePath(ROUTES.ACCOUNT_SALES);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function adminResolveDisputeBuyerAction(
  disputeId: string,
  resolution?: string,
): Promise<TrustActionResult> {
  try {
    const admin = await requireAdminSession();
    await resolveDisputeForBuyer(disputeId, admin.id, resolution);
    revalidatePath(ROUTES.ADMIN_DISPUTES);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function adminResolveDisputeSellerAction(
  disputeId: string,
  resolution?: string,
): Promise<TrustActionResult> {
  try {
    const admin = await requireAdminSession();
    await resolveDisputeForSeller(disputeId, admin.id, resolution);
    revalidatePath(ROUTES.ADMIN_DISPUTES);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}
