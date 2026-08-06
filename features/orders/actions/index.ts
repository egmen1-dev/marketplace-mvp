"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth";
import { createOrderFromCart } from "@/features/orders/queries";
import { checkoutFormSchema } from "@/features/orders/schemas";
import type { CreateOrderResult } from "@/features/orders/types";
import { createCheckoutSessionForOrder } from "@/features/payments";
import { orderPath, ROUTES } from "@/lib/constants";

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
    deliveryMethod: formData.get("deliveryMethod") ?? "PICKUP",
    pickupPointId: formData.get("pickupPointId") ?? "",
    pickupAddress: formData.get("pickupAddress") ?? "",
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
      error: "Проверьте данные доставки",
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
  revalidatePath(orderPath(result.orderId));

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
