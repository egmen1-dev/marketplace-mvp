import { create } from "zustand";

export type AppMode = "buyer" | "seller";

type AppState = {
  mode: AppMode;
  bootstrapped: boolean;
  offline: boolean;
  pendingDeepLink: string | null;
  setMode: (mode: AppMode) => void;
  setBootstrapped: (value: boolean) => void;
  setOffline: (value: boolean) => void;
  setPendingDeepLink: (uri: string | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  mode: "buyer",
  bootstrapped: false,
  offline: false,
  pendingDeepLink: null,
  setMode: (mode) => set({ mode }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  setOffline: (offline) => set({ offline }),
  setPendingDeepLink: (pendingDeepLink) => set({ pendingDeepLink }),
}));
