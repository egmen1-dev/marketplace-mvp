import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { fetchBuyerHome, fetchCart, fetchFavorites } from "../api/endpoints";
import { useAppStore } from "../store/app-store";

export function useTabBadges() {
  const setBadges = useAppStore((s) => s.setBadges);
  const mode = useAppStore((s) => s.mode);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [cart, favorites, home] = await Promise.all([
            fetchCart().catch(() => null),
            fetchFavorites().catch(() => null),
            mode === "buyer" ? fetchBuyerHome().catch(() => null) : Promise.resolve(null),
          ]);
          if (cancelled) return;
          const cartItems = (cart?.items as unknown[] | undefined) ?? [];
          setBadges({
            cart: Number(cart?.itemCount ?? cartItems.length),
            favorites: favorites?.items?.length ?? 0,
            orders: (home as { orders?: { active: number } } | null)?.orders?.active ?? 0,
          });
        } catch {
          // badges are best-effort
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [mode, setBadges]),
  );
}
