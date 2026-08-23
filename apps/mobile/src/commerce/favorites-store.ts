import { create } from "zustand";

import { fetchFavorites } from "../api/endpoints";

type FavoritesState = {
  ids: Set<string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setFavorite: (productId: string, isFavorite: boolean) => void;
  setAll: (productIds: string[]) => void;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set(),
  hydrated: false,
  hydrate: async () => {
    try {
      const res = await fetchFavorites();
      set({ ids: new Set(res.items.map((i) => i.id)), hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setFavorite: (productId, isFavorite) => {
    const next = new Set(get().ids);
    if (isFavorite) next.add(productId);
    else next.delete(productId);
    set({ ids: next });
  },
  setAll: (productIds) => set({ ids: new Set(productIds) }),
}));

export function isProductFavorite(productId: string): boolean {
  return useFavoritesStore.getState().ids.has(productId);
}
