import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";

import { domainErrorMessage } from "../domain/errors/error-factory";
import { getCommerceUseCases } from "../domain/services/commerce-container";
import { useAppStore } from "../store/app-store";

const COMPLETED_ORDER_STATUSES = new Set(["delivered", "cancelled", "refunded"]);

export function useTabBadges() {
  const commerce = getCommerceUseCases();
  const setBadges = useAppStore((s) => s.setBadges);
  const mode = useAppStore((s) => s.mode);

  const refreshBadges = useCallback(async () => {
    try {
      const [cartResult, favoritesResult, ordersResult] = await Promise.all([
        commerce.loadCart.execute({}),
        commerce.loadFavorites.execute({}),
        mode === "buyer" ? commerce.loadOrders.execute({}) : Promise.resolve(null),
      ]);

      const cartCount = cartResult.ok ? cartResult.value.itemCount : 0;
      const favoritesCount = favoritesResult.ok ? favoritesResult.value.items.length : 0;
      const ordersCount =
        ordersResult && ordersResult.ok
          ? ordersResult.value.filter((order) => !COMPLETED_ORDER_STATUSES.has(order.status)).length
          : 0;

      setBadges({
        cart: cartCount,
        favorites: favoritesCount,
        orders: ordersCount,
      });
    } catch {
      // badges are best-effort
    }
  }, [commerce.loadCart, commerce.loadFavorites, commerce.loadOrders, mode, setBadges]);

  useFocusEffect(
    useCallback(() => {
      void refreshBadges();
    }, [refreshBadges]),
  );

  useEffect(() => {
    const unsubscribers = [
      commerce.events.subscribe("CartUpdated", (event) => {
        setBadges({ cart: event.cart.itemCount });
      }),
      commerce.events.subscribe("FavoriteChanged", () => {
        void commerce.loadFavorites.execute({}).then((result) => {
          if (result.ok) setBadges({ favorites: result.value.items.length });
        });
      }),
      commerce.events.subscribe("OrderCreated", () => {
        void commerce.loadOrders.execute({}).then((result) => {
          if (result.ok) {
            setBadges({
              orders: result.value.filter((order) => !COMPLETED_ORDER_STATUSES.has(order.status)).length,
            });
          }
        });
      }),
    ];
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [commerce.events, commerce.loadFavorites, commerce.loadOrders, setBadges]);
}
