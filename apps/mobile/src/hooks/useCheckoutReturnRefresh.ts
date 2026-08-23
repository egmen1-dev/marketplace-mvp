import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { usePathname, router } from "expo-router";

import { fetchOrders } from "../api/endpoints";
import { refreshTabBadges } from "../commerce/refresh-tab-badges";
import { formatBuyerOrderStatus } from "../commerce/order-status";
import { useAppStore } from "../store/app-store";

/** Refresh orders when app returns to foreground from checkout browser handoff. */
export function useCheckoutReturnRefresh() {
  const pathname = usePathname();
  const setCheckoutSuccess = useAppStore((s) => s.setCheckoutSuccess);

  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState;

    const sub = AppState.addEventListener("change", (next) => {
      const resumed = /inactive|background/.test(previous) && next === "active";
      previous = next;
      if (!resumed) return;
      if (pathname !== "/checkout" && pathname !== "/cart") return;

      void (async () => {
        try {
          const { items } = await fetchOrders();
          await refreshTabBadges();
          const latest = items[0];
          if (!latest?.id) {
            router.replace("/(tabs)/orders");
            return;
          }
          setCheckoutSuccess({
            orderId: String(latest.id),
            orderNumber: String(latest.orderNumber ?? latest.id),
            statusLabel: formatBuyerOrderStatus(String(latest.status ?? "NEW")),
          });
          router.replace(`/(tabs)/orders?checkoutSuccess=1`);
        } catch {
          router.replace("/(tabs)/orders");
        }
      })();
    });

    return () => sub.remove();
  }, [pathname, setCheckoutSuccess]);
}
