"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAdminAction } from "@/features/admin/queries";
import {
  AdminRequiredError,
  AuthRequiredError,
  requireAdminSession,
  requireSellerSession,
} from "@/features/auth";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isSellerPayoutEnabled } from "./flags";
import {
  approvePayoutRequest,
  markPayoutCompleted,
  markPayoutProcessing,
  PayoutLifecycleError,
  rejectPayoutRequest,
} from "./lifecycle";
import { createSellerPaymentMethod } from "./methods";
import {
  assertAdminPayoutAccess,
  assertSellerPayoutAccess,
  SellerPayoutForbiddenError,
} from "./permissions";
import {
  cancelPayoutRequest,
  createPayoutRequest,
} from "./requests";
import { PayoutBalanceError } from "./lifecycle";
import { PAYOUT_ENTITY_TYPE } from "./types";

export type PayoutActionState = {
  ok: boolean;
  error?: string;
  requestId?: string;
  methodId?: string;
};

function disabledState(): PayoutActionState {
  return { ok: false, error: "SELLER_PAYOUT_ENABLED=false" };
}

function mapError(err: unknown): PayoutActionState {
  if (err instanceof AuthRequiredError) {
    return { ok: false, error: "Требуется вход" };
  }
  if (err instanceof AdminRequiredError) {
    return { ok: false, error: "Требуются права администратора" };
  }
  if (err instanceof SellerPayoutForbiddenError) {
    return { ok: false, error: err.message };
  }
  if (err instanceof PayoutBalanceError || err instanceof PayoutLifecycleError) {
    return { ok: false, error: err.message };
  }
  if (err instanceof Error) {
    return { ok: false, error: err.message };
  }
  return { ok: false, error: "Не удалось выполнить операцию" };
}

const amountSchema = z.coerce.number().finite().positive();
const methodTypeSchema = z.enum(["CARD", "BANK_ACCOUNT"]);

export async function createPayoutRequestAction(input: {
  amount: number;
  paymentMethodId: string;
}): Promise<PayoutActionState> {
  if (!isSellerPayoutEnabled()) return disabledState();

  let seller;
  try {
    seller = await requireSellerSession();
    assertSellerPayoutAccess({
      role: seller.role,
      sellerProfileId: seller.sellerProfileId,
    });
  } catch (err) {
    return mapError(err);
  }

  const amountParsed = amountSchema.safeParse(input.amount);
  if (!amountParsed.success) {
    return { ok: false, error: "Некорректная сумма" };
  }

  try {
    const request = await createPayoutRequest({
      sellerId: seller.sellerProfileId,
      amount: amountParsed.data,
      paymentMethodId: input.paymentMethodId,
    });

    void trackServerEvent({
      event: ANALYTICS_EVENTS.PAYOUT_REQUEST_CREATED,
      route: ROUTES.ACCOUNT_PAYOUTS,
      entityId: request.id,
    });

    revalidatePath(ROUTES.ACCOUNT_BALANCE);
    revalidatePath(ROUTES.ACCOUNT_PAYOUTS);
    revalidatePath(ROUTES.ADMIN_PAYOUTS);

    return { ok: true, requestId: request.id };
  } catch (err) {
    return mapError(err);
  }
}

export async function addPaymentMethodAction(input: {
  type: string;
  detailsReference: string;
  label?: string;
}): Promise<PayoutActionState> {
  if (!isSellerPayoutEnabled()) return disabledState();

  let seller;
  try {
    seller = await requireSellerSession();
    assertSellerPayoutAccess({
      role: seller.role,
      sellerProfileId: seller.sellerProfileId,
    });
  } catch (err) {
    return mapError(err);
  }

  const typeParsed = methodTypeSchema.safeParse(input.type);
  if (!typeParsed.success) {
    return { ok: false, error: "Выберите способ получения" };
  }
  if (!input.detailsReference.trim()) {
    return { ok: false, error: "Укажите номер карты или счёта" };
  }

  try {
    const method = await createSellerPaymentMethod({
      sellerId: seller.sellerProfileId,
      type: typeParsed.data,
      detailsReference: input.detailsReference,
      label: input.label,
    });
    revalidatePath(ROUTES.ACCOUNT_PAYOUTS);
    return { ok: true, methodId: method.id };
  } catch (err) {
    return mapError(err);
  }
}

export async function cancelPayoutRequestAction(
  requestId: string,
): Promise<PayoutActionState> {
  if (!isSellerPayoutEnabled()) return disabledState();

  let seller;
  try {
    seller = await requireSellerSession();
    assertSellerPayoutAccess({
      role: seller.role,
      sellerProfileId: seller.sellerProfileId,
    });
  } catch (err) {
    return mapError(err);
  }

  try {
    await cancelPayoutRequest({
      sellerId: seller.sellerProfileId,
      requestId,
    });
    revalidatePath(ROUTES.ACCOUNT_BALANCE);
    revalidatePath(ROUTES.ACCOUNT_PAYOUTS);
    revalidatePath(ROUTES.ADMIN_PAYOUTS);
    return { ok: true, requestId };
  } catch (err) {
    return mapError(err);
  }
}

export async function adminApprovePayoutAction(
  requestId: string,
): Promise<PayoutActionState> {
  if (!isSellerPayoutEnabled()) return disabledState();

  let admin;
  try {
    admin = await requireAdminSession();
    assertAdminPayoutAccess(admin.role);
  } catch (err) {
    return mapError(err);
  }

  try {
    await approvePayoutRequest(requestId);
    await logAdminAction({
      adminId: admin.id,
      action: "PAYOUT_APPROVED",
      entityType: PAYOUT_ENTITY_TYPE,
      entityId: requestId,
    });
    revalidatePath(ROUTES.ADMIN_PAYOUTS);
    revalidatePath(ROUTES.ACCOUNT_PAYOUTS);
    return { ok: true, requestId };
  } catch (err) {
    return mapError(err);
  }
}

export async function adminRejectPayoutAction(input: {
  requestId: string;
  adminNote?: string;
}): Promise<PayoutActionState> {
  if (!isSellerPayoutEnabled()) return disabledState();

  let admin;
  try {
    admin = await requireAdminSession();
    assertAdminPayoutAccess(admin.role);
  } catch (err) {
    return mapError(err);
  }

  try {
    await rejectPayoutRequest(input);
    await logAdminAction({
      adminId: admin.id,
      action: "PAYOUT_REJECTED",
      entityType: PAYOUT_ENTITY_TYPE,
      entityId: input.requestId,
      meta: input.adminNote ? { note: input.adminNote } : null,
    });
    void trackServerEvent({
      event: ANALYTICS_EVENTS.PAYOUT_REJECTED,
      route: ROUTES.ADMIN_PAYOUTS,
      entityId: input.requestId,
    });
    revalidatePath(ROUTES.ADMIN_PAYOUTS);
    revalidatePath(ROUTES.ACCOUNT_BALANCE);
    revalidatePath(ROUTES.ACCOUNT_PAYOUTS);
    return { ok: true, requestId: input.requestId };
  } catch (err) {
    return mapError(err);
  }
}

export async function adminMarkPayoutProcessingAction(
  requestId: string,
): Promise<PayoutActionState> {
  if (!isSellerPayoutEnabled()) return disabledState();

  let admin;
  try {
    admin = await requireAdminSession();
    assertAdminPayoutAccess(admin.role);
  } catch (err) {
    return mapError(err);
  }

  try {
    await markPayoutProcessing(requestId);
    await logAdminAction({
      adminId: admin.id,
      action: "PAYOUT_PROCESSING",
      entityType: PAYOUT_ENTITY_TYPE,
      entityId: requestId,
    });
    revalidatePath(ROUTES.ADMIN_PAYOUTS);
    revalidatePath(ROUTES.ACCOUNT_PAYOUTS);
    return { ok: true, requestId };
  } catch (err) {
    return mapError(err);
  }
}

export async function adminCompletePayoutAction(input: {
  requestId: string;
  externalReference?: string;
}): Promise<PayoutActionState> {
  if (!isSellerPayoutEnabled()) return disabledState();

  let admin;
  try {
    admin = await requireAdminSession();
    assertAdminPayoutAccess(admin.role);
  } catch (err) {
    return mapError(err);
  }

  try {
    await markPayoutCompleted(input);
    await logAdminAction({
      adminId: admin.id,
      action: "PAYOUT_COMPLETED",
      entityType: PAYOUT_ENTITY_TYPE,
      entityId: input.requestId,
      meta: input.externalReference
        ? { externalReference: input.externalReference }
        : null,
    });
    void trackServerEvent({
      event: ANALYTICS_EVENTS.PAYOUT_COMPLETED,
      route: ROUTES.ADMIN_PAYOUTS,
      entityId: input.requestId,
    });
    revalidatePath(ROUTES.ADMIN_PAYOUTS);
    revalidatePath(ROUTES.ACCOUNT_BALANCE);
    revalidatePath(ROUTES.ACCOUNT_PAYOUTS);
    return { ok: true, requestId: input.requestId };
  } catch (err) {
    return mapError(err);
  }
}

export async function trackPayoutPageViewAction(): Promise<void> {
  if (!isSellerPayoutEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.PAYOUT_PAGE_VIEW,
    route: ROUTES.ACCOUNT_PAYOUTS,
  });
}

export async function trackPayoutRequestStartedAction(): Promise<void> {
  if (!isSellerPayoutEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.PAYOUT_REQUEST_STARTED,
    route: ROUTES.ACCOUNT_PAYOUTS,
  });
}
