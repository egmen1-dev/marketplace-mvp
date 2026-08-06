import type { GuestCartItem, GuestCartStorage } from "@/features/cart/types";

export const CART_STORAGE_KEY = "lot-cart";

export function emptyGuestCart(): GuestCartStorage {
  return { items: [] };
}

export function readGuestCart(): GuestCartStorage {
  if (typeof window === "undefined") return emptyGuestCart();

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return emptyGuestCart();
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as GuestCartStorage).items)
    ) {
      return emptyGuestCart();
    }
    const items = (parsed as GuestCartStorage).items
      .filter(
        (item): item is GuestCartItem =>
          Boolean(item) &&
          typeof item.productId === "string" &&
          item.productId.length > 0 &&
          typeof item.quantity === "number" &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0,
      )
      .map((item) => ({
        productId: item.productId,
        quantity: Math.floor(item.quantity),
      }));
    return { items };
  } catch {
    return emptyGuestCart();
  }
}

export function writeGuestCart(cart: GuestCartStorage): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_STORAGE_KEY);
}

/** Add or increment a guest line; returns updated storage. */
export function upsertGuestItem(
  cart: GuestCartStorage,
  productId: string,
  quantity: number,
  maxStock: number,
): GuestCartStorage {
  const qty = Math.max(1, Math.floor(quantity));
  const existing = cart.items.find((i) => i.productId === productId);
  const nextQty = existing
    ? Math.min(existing.quantity + qty, maxStock)
    : Math.min(qty, maxStock);

  if (maxStock <= 0 || nextQty < 1) {
    return cart;
  }

  const items = existing
    ? cart.items.map((i) =>
        i.productId === productId ? { ...i, quantity: nextQty } : i,
      )
    : [...cart.items, { productId, quantity: nextQty }];

  return { items };
}

export function setGuestItemQuantity(
  cart: GuestCartStorage,
  productId: string,
  quantity: number,
  maxStock: number,
): GuestCartStorage {
  const qty = Math.floor(quantity);
  if (qty < 1) {
    return { items: cart.items.filter((i) => i.productId !== productId) };
  }
  const capped = Math.min(qty, Math.max(1, maxStock));
  const items = cart.items.map((i) =>
    i.productId === productId ? { ...i, quantity: capped } : i,
  );
  return { items };
}

export function removeGuestItem(
  cart: GuestCartStorage,
  productId: string,
): GuestCartStorage {
  return { items: cart.items.filter((i) => i.productId !== productId) };
}
