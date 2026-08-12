"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth";
import { createOrderFromCart } from "@/features/orders/queries";
import { checkoutFormSchema } from "@/features/orders/schemas";
import type { CreateOrderResult } from "@/features/orders/types";
import { createCheckoutSessionForOrder } from "@/features/payments";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { orderPath, ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type CreateOrderActionState =
  | CreateOrderResult
  | { ok: false; error?: string };

/**
 * Create an order from the cart, then start Stripe Checkout.
 * On success returns `checkoutUrl` for client redirect.
 */
export async function createOrderFromCartAction(
  _prev: CreateOrderActionState,
  formData: FormData,
): Promise<CreateOrderActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Войдите, чтобы оформить заказ" };
  }

  const parsed = checkoutFormSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
    city: formData.get("city"),
    street: formData.get("street") ?? "",
    notes: formData.get("notes") ?? "",
    fulfillmentType: formData.get("fulfillmentType") ?? "DELIVERY",
    deliveryMethod: formData.get("deliveryMethod") ?? "PICKUP",
    pickupPointId: formData.get("pickupPointId") ?? "",
    pickupAddress: formData.get("pickupAddress") ?? "",
    sellerPickupPointId: formData.get("sellerPickupPointId") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return {
      ok: false,
      error: "Проверьте данные получения",
      fieldErrors,
    };
  }

  const result = await createOrderFromCart(user.id, parsed.data);

  if (!result.ok) {
    return result;
  }

  revalidatePath(ROUTES.CART);
  revalidatePath(ROUTES.CHECKOUT);
  revalidatePath(ROUTES.ORDERS);
  revalidatePath(ROUTES.ACCOUNT_RESERVATIONS);
  revalidatePath(orderPath(result.orderId));

  const order = await prisma.order.findUnique({
    where: { id: result.orderId },
    select: { total: true },
  });
  const charge = order ? Number(order.total) : 0;

  // Free reservation (0% prepayment) — no Stripe charge
  if (charge <= 0) {
    void trackServerEvent({
      event: ANALYTICS_EVENTS.PURCHASE_COMPLETE,
      route: orderPath(result.orderId),
      entityId: result.orderId,
    });
    return {
      ok: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
    };
  }

  const checkout = await createCheckoutSessionForOrder(
    user.id,
    result.orderId,
  );

  if (!checkout.ok) {
    return {
      ok: false,
      error: checkout.error,
      orderId: result.orderId,
    };
  }

  return {
    ok: true,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    checkoutUrl: checkout.checkoutUrl,
  };
}

/**
 * Start (or restart) Stripe Checkout for an existing unpaid order.
 */
export async function createCheckoutSessionAction(
  orderId: string,
): Promise<
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string }
> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Войдите, чтобы оплатить заказ" };
  }

  const checkout = await createCheckoutSessionForOrder(user.id, orderId);
  if (!checkout.ok) {
    return checkout;
  }

  revalidatePath(orderPath(orderId));
  return { ok: true, checkoutUrl: checkout.checkoutUrl };
}

/** @deprecated Use createCheckoutSessionAction — Checkout Sessions, not PaymentIntents. */
export async function createPaymentIntentAction(
  orderId: string,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  return createCheckoutSessionAction(orderId);
}
