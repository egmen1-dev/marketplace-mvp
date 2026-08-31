import { create } from "zustand";

type BusyMap = Record<string, true>;

type CommerceBusyState = {
  cartProductIds: BusyMap;
  favoriteProductIds: BusyMap;
  setCartBusy: (productId: string, busy: boolean) => void;
  setFavoriteBusy: (productId: string, busy: boolean) => void;
  isCartBusy: (productId: string) => boolean;
  isFavoriteBusy: (productId: string) => boolean;
};

function updateBusyMap(map: BusyMap, productId: string, busy: boolean): BusyMap {
  if (!busy) {
    if (!map[productId]) return map;
    const next = { ...map };
    delete next[productId];
    return next;
  }
  if (map[productId]) return map;
  return { ...map, [productId]: true };
}

export const useCommerceBusyStore = create<CommerceBusyState>((set, get) => ({
  cartProductIds: {},
  favoriteProductIds: {},
  setCartBusy: (productId, busy) => {
    set((state) => ({
      cartProductIds: updateBusyMap(state.cartProductIds, productId, busy),
    }));
  },
  setFavoriteBusy: (productId, busy) => {
    set((state) => ({
      favoriteProductIds: updateBusyMap(state.favoriteProductIds, productId, busy),
    }));
  },
  isCartBusy: (productId) => Boolean(get().cartProductIds[productId]),
  isFavoriteBusy: (productId) => Boolean(get().favoriteProductIds[productId]),
}));

export function selectCartBusyProductIds(state: CommerceBusyState): string[] {
  return Object.keys(state.cartProductIds);
}

export function selectFavoriteBusyProductIds(state: CommerceBusyState): string[] {
  return Object.keys(state.favoriteProductIds);
}
