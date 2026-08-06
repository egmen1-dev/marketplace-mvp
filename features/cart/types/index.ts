import type { ProductStatus } from "@prisma/client";

import type { ProductImageDto } from "@/features/products/types";

/** Guest cart line persisted in localStorage. */
export type GuestCartItem = {
  productId: string;
  quantity: number;
};

/** Shape of `localStorage` key `lot-cart`. */
export type GuestCartStorage = {
  items: GuestCartItem[];
};

/** Product fields needed to render a cart line. */
export type CartProductSnapshot = {
  id: string;
  title: string;
  slug: string;
  price: number;
  currency: string;
  stock: number;
  status: ProductStatus;
  primaryImage: ProductImageDto | null;
};

/** One line in the cart UI / API response. */
export type CartLineItem = {
  /** DB cart item id when authenticated; omitted for guests. */
  id?: string;
  productId: string;
  quantity: number;
  product: CartProductSnapshot;
  lineTotal: number;
};

/** Full cart with computed totals. */
export type CartView = {
  items: CartLineItem[];
  /** Sum of line quantities. */
  itemCount: number;
  /** Sum of line totals (товары). */
  subtotal: number;
  currency: string;
};

export type CartSummary = {
  itemCount: number;
  subtotal: number;
  currency: string;
};

export type CartMutationResult = {
  ok: boolean;
  error?: string;
  cart?: CartView;
};
