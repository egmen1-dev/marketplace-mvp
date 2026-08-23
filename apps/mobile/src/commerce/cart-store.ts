import { create } from "zustand";

export type CartLine = { productId: string; quantity: number };

type CartState = {
  quantities: Record<string, number>;
  pending: Record<string, boolean>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  applyFromCart: (items: CartLine[]) => void;
  setQuantityLocal: (productId: string, quantity: number) => void;
  setPending: (productId: string, pending: boolean) => void;
  getQuantity: (productId: string) => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  quantities: {},
  pending: {},
  hydrated: false,
  hydrate: async () => {
    const { fetchCart } = await import("../api/endpoints");
    try {
      const cart = await fetchCart();
      const items = ((cart.items ?? []) as CartLine[]).map((row) => ({
        productId: row.productId,
        quantity: row.quantity,
      }));
      get().applyFromCart(items);
      set({ hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  applyFromCart: (items) => {
    const quantities: Record<string, number> = {};
    for (const item of items) {
      if (item.productId && item.quantity > 0) quantities[item.productId] = item.quantity;
    }
    set({ quantities });
  },
  setQuantityLocal: (productId, quantity) => {
    const next = { ...get().quantities };
    if (quantity <= 0) delete next[productId];
    else next[productId] = quantity;
    set({ quantities: next });
  },
  setPending: (productId, pending) => {
    const next = { ...get().pending };
    if (pending) next[productId] = true;
    else delete next[productId];
    set({ pending: next });
  },
  getQuantity: (productId) => get().quantities[productId] ?? 0,
}));

export function getCartQuantity(productId: string): number {
  return useCartStore.getState().getQuantity(productId);
}
