import type {
  CartLineItem,
  CartProductSnapshot,
  CartView,
  GuestCartItem,
} from "@/features/cart/types";
import { DEFAULT_CURRENCY } from "@/lib/constants";

export function clampQuantity(quantity: number, stock: number): number {
  const q = Math.floor(quantity);
  if (q < 1) return 0;
  if (stock <= 0) return 0;
  return Math.min(q, stock);
}

export function lineTotal(price: number, quantity: number): number {
  return Math.round(price * quantity * 100) / 100;
}

export function buildCartView(lines: CartLineItem[]): CartView {
  const currency = lines[0]?.product.currency ?? DEFAULT_CURRENCY;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal =
    Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) /
    100;

  return {
    items: lines,
    itemCount,
    subtotal,
    currency,
  };
}

export function buildLineFromProduct(
  product: CartProductSnapshot,
  quantity: number,
  id?: string,
): CartLineItem {
  const qty = Math.max(1, Math.floor(quantity));
  return {
    id,
    productId: product.id,
    quantity: qty,
    product,
    lineTotal: lineTotal(product.price, qty),
  };
}

/** Join guest storage with hydrated products (skips missing products). */
export function buildGuestCartView(
  guestItems: GuestCartItem[],
  products: CartProductSnapshot[],
): CartView {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: CartLineItem[] = [];

  for (const item of guestItems) {
    const product = byId.get(item.productId);
    if (!product) continue;
    const qty = clampQuantity(item.quantity, product.stock);
    if (qty < 1) continue;
    lines.push(buildLineFromProduct(product, qty));
  }

  return buildCartView(lines);
}
