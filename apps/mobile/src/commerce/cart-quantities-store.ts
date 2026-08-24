import { create } from "zustand";

import { fetchCart } from "../api/endpoints";

type CartQuantitiesState = {
  quantities: Record<string, number>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setQuantity: (productId: string, quantity: number) => void;
  applyCartItems: (items: Array<{ productId: string; quantity: number }>) => void;
};

export const useCartQuantitiesStore = create<CartQuantitiesState>((set, get) => ({
  quantities: {},
  hydrated: false,
  hydrate: async () => {
    try {
      const cart = await fetchCart();
      const items = (cart?.items as Array<{ productId: string; quantity: number }> | undefined) ?? [];
      get().applyCartItems(items);
      set({ hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setQuantity: (productId, quantity) => {
    const next = { ...get().quantities };
    if (quantity <= 0) delete next[productId];
    else next[productId] = quantity;
    set({ quantities: next });
  },
  applyCartItems: (items) => {
    const quantities: Record<string, number> = {};
    for (const item of items) {
      if (item.quantity > 0) quantities[item.productId] = item.quantity;
    }
    set({ quantities });
  },
}));

export function getCartQuantity(productId: string): number {
  return useCartQuantitiesStore.getState().quantities[productId] ?? 0;
}
