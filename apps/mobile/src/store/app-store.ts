import { create } from "zustand";

import type { MobileUpdateInfo } from "../api/endpoints";

export type AppMode = "buyer" | "seller";

type TabBadges = {
  cart: number;
  favorites: number;
  orders: number;
};

type AppState = {
  mode: AppMode;
  bootstrapped: boolean;
  bootDegraded: boolean;
  offline: boolean;
  pendingDeepLink: string | null;
  remoteConfig: Record<string, unknown>;
  userRole: string | null;
  sellerCapable: boolean;
  pendingUpdate: MobileUpdateInfo | null;
  badges: TabBadges;
  setMode: (mode: AppMode) => void;
  setBootstrapped: (value: boolean) => void;
  setBootDegraded: (value: boolean) => void;
  setOffline: (value: boolean) => void;
  setPendingDeepLink: (uri: string | null) => void;
  setRemoteConfig: (config: Record<string, unknown>) => void;
  setUserRole: (role: string | null) => void;
  setPendingUpdate: (update: MobileUpdateInfo | null) => void;
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
  remoteConfig: {},
  userRole: null,
  sellerCapable: false,
  pendingUpdate: null,
  badges: { cart: 0, favorites: 0, orders: 0 },
  setMode: (mode) => set({ mode }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  setBootDegraded: (bootDegraded) => set({ bootDegraded }),
  setOffline: (offline) => set({ offline }),
  setPendingDeepLink: (pendingDeepLink) => set({ pendingDeepLink }),
  setRemoteConfig: (remoteConfig) => set({ remoteConfig }),
  setUserRole: (role) =>
    set({
      userRole: role,
      sellerCapable: isSellerRole(role),
      mode: "buyer",
    }),
  setPendingUpdate: (pendingUpdate) => set({ pendingUpdate }),
  setBadges: (badges) => set((state) => ({ badges: { ...state.badges, ...badges } })),
}));
