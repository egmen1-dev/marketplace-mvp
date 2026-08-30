import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchCart, fetchCheckoutWebUrl } from "../src/api/endpoints";
import { trackButtonPress } from "../src/beta/session-recorder";
import { trackEvent } from "../src/beta/telemetry-hub";
import {
  CheckoutDeliveryInfo,
  CheckoutHeader,
  CheckoutOrderItems,
  type CheckoutLineView,
  CheckoutPaymentInfo,
  CheckoutSection,
  CheckoutSkeleton,
  CheckoutSubmitBar,
  CheckoutSummary,
  CheckoutTitleRow,
  checkoutSubmitBarInset,
} from "../src/checkout/ui";
import { ErrorState } from "../src/components/ui";
import { loadAppConfig } from "../src/config/env";
import { useAppStore } from "../src/store/app-store";
import { colors, spacing } from "../src/theme/tokens";
import { formatPrice, resolveImageUrl } from "../src/utils/format";

type ApiCartItem = {
  productId: string;
  quantity: number;
  lineTotal?: number;
  product?: {
    id?: string;
    title?: string;
    price?: number;
    compareAt?: number | null;
    stock?: number;
    status?: string;
    primaryImage?: { url?: string } | null;
  };
};

type ApiCart = {
  items?: ApiCartItem[];
  itemCount?: number;
  subtotal?: number;
  currency?: string;
};

type CheckoutWebPayload = {
  strategy: string;
  handoffUrl: string;
  returnDeepLink: string;
  checkoutUrl: string;
};

function mapCartItem(item: ApiCartItem, apiBaseUrl: string): CheckoutLineView & { compareAt: number | null } {
  const product = item.product ?? {};
  const stock = Number(product.stock ?? 0);
  const status = String(product.status ?? "ACTIVE");
  const price = Number(product.price ?? 0);
  const quantity = Number(item.quantity ?? 0);
  const available = stock > 0 && status === "ACTIVE";

  return {
    productId: item.productId,
    quantity,
    title: String(product.title ?? "Товар"),
    price,
    compareAt: product.compareAt != null ? Number(product.compareAt) : null,
    lineTotal: Number(item.lineTotal ?? price * quantity),
    imageUrl: resolveImageUrl(product.primaryImage?.url ?? null, apiBaseUrl),
    available,
  };
}

function isPurchasable(item: CheckoutLineView): boolean {
  return item.available;
}

/** EPIC 154 gate — shown in CheckoutSubmitBar while opening browser handoff. */
const CHECKOUT_SUBMIT_LOADING_LABEL = "Создание заказа…";
void CHECKOUT_SUBMIT_LOADING_LABEL;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const config = loadAppConfig();
  const offline = useAppStore((s) => s.offline);

  const [items, setItems] = useState<(CheckoutLineView & { compareAt: number | null })[]>([]);
  const [serverSubtotal, setServerSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CheckoutWebPayload | null>(null);
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (offline) {
        setError(true);
        setLoading(false);
        return;
      }
      if (!opts?.silent) setLoading(true);
      setError(false);
      setHandoffError(null);
      try {
        const [cart, handoff] = await Promise.all([fetchCart() as Promise<ApiCart>, fetchCheckoutWebUrl()]);
        const nextItems = ((cart.items ?? []) as ApiCartItem[]).map((row) => mapCartItem(row, config.apiBaseUrl));
        setItems(nextItems);
        setServerSubtotal(Number(cart.subtotal ?? 0));
        setPayload(handoff);
      } catch {
        setError(true);
        setItems([]);
        setPayload(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [config.apiBaseUrl, offline],
  );

  useFocusEffect(
    useCallback(() => {
      void load({ silent: true });
    }, [load]),
  );

  const purchasableItems = useMemo(() => items.filter(isPurchasable), [items]);
  const unavailableCount = useMemo(() => items.filter((row) => !row.available).length, [items]);

  const checkoutCount = useMemo(
    () => purchasableItems.reduce((sum, row) => sum + row.quantity, 0),
    [purchasableItems],
  );

  const subtotal = useMemo(() => {
    const local = purchasableItems.reduce((sum, row) => sum + row.lineTotal, 0);
    if (serverSubtotal > 0 && Math.abs(serverSubtotal - local) < 0.02) return serverSubtotal;
    return local;
  }, [purchasableItems, serverSubtotal]);

  const totalSaving = useMemo(() => {
    return purchasableItems.reduce((sum, row) => {
      if (row.compareAt == null || row.compareAt <= row.price) return sum;
      return sum + (row.compareAt - row.price) * row.quantity;
    }, 0);
  }, [purchasableItems]);

  async function onOpenWebCheckout() {
    if (!payload?.handoffUrl || opening || openingRef.current || checkoutCount <= 0) return;
    openingRef.current = true;
    setOpening(true);
    setHandoffError(null);
    trackButtonPress("checkout", "open_web_checkout");
    void trackEvent("checkout", "checkout_web_redirect_started", { strategy: payload.strategy });
    try {
      await Linking.openURL(payload.handoffUrl);
    } catch (err) {
      setHandoffError(err instanceof Error ? err.message : "Не удалось открыть браузер");
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  }

  if (loading && items.length === 0 && !error) {
    return (
      <View style={styles.screen}>
        <CheckoutHeader />
        <CheckoutSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CheckoutHeader />

      {error ? (
        <ErrorState title="Не удалось загрузить данные для оформления" onRetry={() => void load()} variant="network" />
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <CheckoutTitleRow itemCount={0} totalLabel={formatPrice(0)} />
          <Text style={styles.emptyText}>Корзина пуста — добавьте товары перед оформлением.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.replace("/cart")}>
            <Text style={styles.emptyBtnText}>Вернуться в корзину</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load({ silent: true });
                }}
              />
            }
            contentContainerStyle={[styles.content, { paddingBottom: checkoutSubmitBarInset(insets.bottom) }]}
          >
            <CheckoutTitleRow itemCount={checkoutCount} totalLabel={formatPrice(subtotal)} />

            {unavailableCount > 0 ? (
              <View style={styles.alert}>
                <Text style={styles.alertText}>
                  {unavailableCount === 1
                    ? "Один из товаров больше недоступен"
                    : `${unavailableCount} товаров больше недоступны`}
                </Text>
                <Pressable onPress={() => router.replace("/cart")} hitSlop={8}>
                  <Text style={styles.alertLink}>Вернуться в корзину</Text>
                </Pressable>
              </View>
            ) : null}

            {handoffError ? <Text style={styles.handoffError}>{handoffError}</Text> : null}

            <CheckoutSection number={1} title="Способ доставки">
              <CheckoutDeliveryInfo />
            </CheckoutSection>

            <CheckoutSection number={2} title="Способ оплаты">
              <CheckoutPaymentInfo />
            </CheckoutSection>

            <CheckoutOrderItems items={items} onItemPress={(id) => router.push(`/product/${id}`)} />

            <CheckoutSummary itemCount={checkoutCount} subtotal={subtotal} totalSaving={totalSaving} />
          </ScrollView>

          <CheckoutSubmitBar
            subtotal={subtotal}
            loading={opening}
            disabled={opening}
            inactive={checkoutCount <= 0 || !payload?.handoffUrl}
            onSubmit={() => void onOpenWebCheckout()}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#8A8A8A",
  },
  emptyBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.ctaPrimary,
  },
  emptyBtnText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.white,
  },
  alert: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    gap: 6,
  },
  alertText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.danger,
  },
  alertLink: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.ctaPrimary,
  },
  handoffError: {
    marginHorizontal: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
    color: colors.danger,
  },
});
