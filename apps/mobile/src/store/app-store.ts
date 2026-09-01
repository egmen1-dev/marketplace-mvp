import { create } from "zustand";

import type { MobileUpdateInfo } from "../api/endpoints";
import type { CheckoutHandoffContext } from "../commerce/checkout-return";

export type AppMode = "buyer" | "seller";

type TabBadges = {
  cart: number;
  favorites: number;
  orders: number;
  messages: number;
};

export type CheckoutSuccessState = {
  orderId: string;
  orderNumber: string;
  statusLabel: string;
} | null;

export type PendingWebHandoffKind = "seller" | "checkout";

type AppState = {
  mode: AppMode;
  bootstrapped: boolean;
  bootDegraded: boolean;
  offline: boolean;
  pendingDeepLink: string | null;
  checkoutSuccess: CheckoutSuccessState;
  checkoutHandoff: CheckoutHandoffContext | null;
  pendingWebHandoff: PendingWebHandoffKind | null;
  remoteConfig: Record<string, unknown>;
  userRole: string | null;
  sellerCapable: boolean;
  pendingUpdate: MobileUpdateInfo | null;
  updateAvailable: MobileUpdateInfo | null;
  badges: TabBadges;
  setMode: (mode: AppMode) => void;
  setBootstrapped: (value: boolean) => void;
  setBootDegraded: (value: boolean) => void;
  setOffline: (value: boolean) => void;
  setPendingDeepLink: (uri: string | null) => void;
  setCheckoutSuccess: (state: CheckoutSuccessState) => void;
  clearCheckoutSuccess: () => void;
  setCheckoutHandoff: (context: CheckoutHandoffContext | null) => void;
  clearCheckoutHandoff: () => void;
  setPendingWebHandoff: (kind: PendingWebHandoffKind | null) => void;
  setRemoteConfig: (config: Record<string, unknown>) => void;
  setUserRole: (role: string | null) => void;
  setPendingUpdate: (update: MobileUpdateInfo | null) => void;
  setUpdateAvailable: (update: MobileUpdateInfo | null) => void;
  setBadges: (badges: Partial<TabBadges>) => void;
};

function isSellerRole(role: string | null): boolean {
  return role === "SELLER" || role === "ADMIN";
}

export const useAppStore = create<AppState>((set) => ({
  mode: "buyer",
  bootstrapped: false,
  bootDegraded: false,
  offline: false,
  pendingDeepLink: null,
  checkoutSuccess: null,
  checkoutHandoff: null,
  pendingWebHandoff: null,
  remoteConfig: {},
  userRole: null,
  sellerCapable: false,
  pendingUpdate: null,
  updateAvailable: null,
  badges: { cart: 0, favorites: 0, orders: 0, messages: 0 },
  setMode: (mode) => set({ mode }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  setBootDegraded: (bootDegraded) => set({ bootDegraded }),
  setOffline: (offline) => set({ offline }),
  setPendingDeepLink: (pendingDeepLink) => set({ pendingDeepLink }),
  setCheckoutSuccess: (checkoutSuccess) => set({ checkoutSuccess }),
  clearCheckoutSuccess: () => set({ checkoutSuccess: null }),
  setCheckoutHandoff: (checkoutHandoff) => set({ checkoutHandoff }),
  clearCheckoutHandoff: () => set({ checkoutHandoff: null }),
  setPendingWebHandoff: (pendingWebHandoff) => set({ pendingWebHandoff }),
  setRemoteConfig: (remoteConfig) => set({ remoteConfig }),
  setUserRole: (role) =>
    set({
      userRole: role,
      sellerCapable: isSellerRole(role),
      mode: "buyer",
    }),
  setPendingUpdate: (pendingUpdate) => set({ pendingUpdate }),
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
  setBadges: (badges) => set((state) => ({ badges: { ...state.badges, ...badges } })),
}));
