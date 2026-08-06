"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth";
import {
  addToCart,
  CartServiceError,
  getCartForUser,
  mergeGuestCartIntoUser,
  removeFromCart,
  updateCartItemQuantity,
} from "@/features/cart/queries";
import {
  addToCartSchema,
  mergeCartSchema,
  updateCartItemSchema,
} from "@/features/cart/schemas";
import type { CartMutationResult, CartView } from "@/features/cart/types";
import { ROUTES } from "@/lib/constants";

function cartError(err: unknown): CartMutationResult {
  if (err instanceof CartServiceError) {
    return { ok: false, error: err.message };
  }
  console.error("[cart action]", err);
  return { ok: false, error: "Не удалось обновить корзину" };
}

function revalidateCart() {
  revalidatePath(ROUTES.CART);
}

export async function getCartAction(): Promise<CartView | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return getCartForUser(user.id);
}

export async function addToCartAction(input: {
  productId: string;
  quantity?: number;
}): Promise<CartMutationResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Требуется вход" };
  }

  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Некорректные данные" };
  }

  try {
    const cart = await addToCart(
      user.id,
      parsed.data.productId,
      parsed.data.quantity,
    );
    revalidateCart();
    return { ok: true, cart };
  } catch (err) {
    return cartError(err);
  }
}

export async function updateCartItemAction(input: {
  productId: string;
  quantity: number;
}): Promise<CartMutationResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Требуется вход" };
  }

  const parsed = updateCartItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Некорректные данные" };
  }

  try {
    const cart = await updateCartItemQuantity(
      user.id,
      parsed.data.productId,
      parsed.data.quantity,
    );
    revalidateCart();
    return { ok: true, cart };
  } catch (err) {
    return cartError(err);
  }
}

export async function removeFromCartAction(input: {
  productId: string;
}): Promise<CartMutationResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Требуется вход" };
  }

  if (!input.productId) {
    return { ok: false, error: "Укажите товар" };
  }

  try {
    const cart = await removeFromCart(user.id, input.productId);
    revalidateCart();
    return { ok: true, cart };
  } catch (err) {
    return cartError(err);
  }
}

export async function mergeGuestCartAction(input: {
  items: { productId: string; quantity: number }[];
}): Promise<CartMutationResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Требуется вход" };
  }

  const parsed = mergeCartSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Некорректные данные" };
  }

  try {
    const cart = await mergeGuestCartIntoUser(user.id, parsed.data.items);
    revalidateCart();
    return { ok: true, cart };
  } catch (err) {
    return cartError(err);
  }
}
