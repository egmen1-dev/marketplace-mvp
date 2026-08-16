import { create } from "zustand";

export type AppMode = "buyer" | "seller";

type TabBadges = {
  cart: number;
  favorites: number;
  orders: number;
};

type AppState = {
  mode: AppMode;
  bootstrapped: boolean;
  offline: boolean;
  pendingDeepLink: string | null;
  remoteConfig: Record<string, unknown>;
  userRole: string | null;
  sellerCapable: boolean;
  badges: TabBadges;
  setMode: (mode: AppMode) => void;
  setBootstrapped: (value: boolean) => void;
  setOffline: (value: boolean) => void;
  setPendingDeepLink: (uri: string | null) => void;
  setRemoteConfig: (config: Record<string, unknown>) => void;
  setUserRole: (role: string | null) => void;
  setBadges: (badges: Partial<TabBadges>) => void;
};

function isSellerRole(role: string | null): boolean {
  return role === "SELLER" || role === "ADMIN";
}

export const useAppStore = create<AppState>((set) => ({
  mode: "buyer",
  bootstrapped: false,
  offline: false,
  pendingDeepLink: null,
  remoteConfig: {},
  userRole: null,
  sellerCapable: false,
  badges: { cart: 0, favorites: 0, orders: 0 },
  setMode: (mode) => set({ mode }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  setOffline: (offline) => set({ offline }),
  setPendingDeepLink: (pendingDeepLink) => set({ pendingDeepLink }),
  setRemoteConfig: (remoteConfig) => set({ remoteConfig }),
  setUserRole: (role) =>
    set({
      userRole: role,
      sellerCapable: isSellerRole(role),
      mode: isSellerRole(role) ? "seller" : "buyer",
    }),
  setBadges: (badges) => set((state) => ({ badges: { ...state.badges, ...badges } })),
}));
