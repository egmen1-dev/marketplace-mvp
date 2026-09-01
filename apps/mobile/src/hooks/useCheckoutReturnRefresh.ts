import { useEffect } from "react";
import * as Linking from "expo-linking";
import { AppState, type AppStateStatus } from "react-native";
import { usePathname, router } from "expo-router";

import { fetchOrders } from "../api/endpoints";
import { correlateCheckoutReturnOrder, extractOrderIdFromLotDeepLink } from "../commerce/checkout-return";
import { refreshTabBadges } from "../commerce/refresh-tab-badges";
import { formatBuyerOrderStatus } from "../commerce/order-status";
import { useAppStore } from "../store/app-store";

function buildCheckoutSuccess(order: Record<string, unknown>) {
  return {
    orderId: String(order.id),
    orderNumber: String(order.orderNumber ?? order.id),
    statusLabel: formatBuyerOrderStatus(String(order.status ?? "NEW")),
  };
}

/** Refresh orders when app returns to foreground from checkout browser handoff. */
export function useCheckoutReturnRefresh() {
  const pathname = usePathname();
  const setCheckoutSuccess = useAppStore((s) => s.setCheckoutSuccess);
  const clearCheckoutHandoff = useAppStore((s) => s.clearCheckoutHandoff);
  const setPendingWebHandoff = useAppStore((s) => s.setPendingWebHandoff);

  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState;

    const sub = AppState.addEventListener("change", (next) => {
      const resumed = /inactive|background/.test(previous) && next === "active";
      previous = next;
      if (!resumed) return;
      if (pathname !== "/checkout" && pathname !== "/cart") return;

      void (async () => {
        try {
          const initialUrl = await Linking.getInitialURL();
          const deepLinkOrderId = initialUrl ? extractOrderIdFromLotDeepLink(initialUrl) : null;
          if (deepLinkOrderId) {
            clearCheckoutHandoff();
            setPendingWebHandoff(null);
            router.replace(`/order/${deepLinkOrderId}?checkoutSuccess=1`);
            return;
          }

          const { items } = await fetchOrders();
          await refreshTabBadges();

          const checkoutHandoff = useAppStore.getState().checkoutHandoff;
          if (!checkoutHandoff) {
            router.replace("/(tabs)/orders");
            return;
          }

          const correlated = correlateCheckoutReturnOrder(items, checkoutHandoff);
          clearCheckoutHandoff();
          setPendingWebHandoff(null);

          if (!correlated?.id) {
            router.replace("/(tabs)/orders");
            return;
          }

          setCheckoutSuccess(buildCheckoutSuccess(correlated));
          router.replace(`/(tabs)/orders?checkoutSuccess=1`);
        } catch {
          clearCheckoutHandoff();
          router.replace("/(tabs)/orders");
        }
      })();
    });

    return () => sub.remove();
  }, [pathname, setCheckoutSuccess, clearCheckoutHandoff, setPendingWebHandoff]);
}
