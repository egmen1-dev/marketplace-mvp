import { create } from "zustand";

type ToastTone = "success" | "error" | "info";

type CommerceToastState = {
  message: string | null;
  tone: ToastTone;
  show: (message: string, tone?: ToastTone) => void;
  clear: () => void;
};

export const useCommerceToastStore = create<CommerceToastState>((set) => ({
  message: null,
  tone: "info",
  show: (message, tone = "info") => set({ message, tone }),
  clear: () => set({ message: null }),
}));

export function showCommerceToast(message: string, tone: ToastTone = "info"): void {
  useCommerceToastStore.getState().show(message, tone);
}
