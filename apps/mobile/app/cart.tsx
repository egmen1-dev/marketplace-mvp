import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchCart } from "../src/api/endpoints";
import { useCartQuantitiesStore } from "../src/commerce/cart-quantities-store";
import { refreshTabBadges } from "../src/commerce/refresh-tab-badges";
import {
  CartCheckoutBar,
  CartDeliveryCard,
  CartEmptyState,
  CartHeader,
  CartItemCard,
  type CartLineView,
  CartSkeleton,
  CartTitleRow,
  cartCheckoutBarInset,
} from "../src/cart/ui";
import { loadAppConfig } from "../src/config/env";
import { useCommerceActions } from "../src/hooks/useCommerceActions";
import { useAppStore } from "../src/store/app-store";
import { colors, spacing } from "../src/theme/tokens";
import { resolveImageUrl } from "../src/utils/format";

import { CART_CHECKOUT_TRANSITION_LOADING_LABEL } from "../src/cart/ui/checkout-transition-copy";

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
};

function mapCartItem(item: ApiCartItem, apiBaseUrl: string): CartLineView {
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
    stock,
  };
}

function isPurchasable(item: CartLineView): boolean {
  return item.available;
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const config = loadAppConfig();
  const offline = useAppStore((s) => s.offline);
  const applyCartItems = useCartQuantitiesStore((s) => s.applyCartItems);
  const { incrementProductCart, decrementProductCart, toggleProductFavorite, isFavorite } = useCommerceActions();

  const [items, setItems] = useState<CartLineView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const busyRef = useRef(new Set<string>());

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (offline) {
        setError(true);
        setLoading(false);
        return;
      }
      if (!opts?.silent) setLoading(true);
      setError(false);
      try {
        const cart = (await fetchCart()) as ApiCart;
        const nextItems = ((cart.items ?? []) as ApiCartItem[]).map((row) => mapCartItem(row, config.apiBaseUrl));
        setItems(nextItems);
        applyCartItems(nextItems.map((row) => ({ productId: row.productId, quantity: row.quantity })));
        await refreshTabBadges();
      } catch {
        setError(true);
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyCartItems, config.apiBaseUrl, offline],
  );

  useFocusEffect(
    useCallback(() => {
      void load({ silent: true });
    }, [load]),
  );

  const itemCount = useMemo(() => items.reduce((sum, row) => sum + row.quantity, 0), [items]);

  const purchasableItems = useMemo(() => items.filter(isPurchasable), [items]);

  const checkoutCount = useMemo(
    () => purchasableItems.reduce((sum, row) => sum + row.quantity, 0),
    [purchasableItems],
  );

  const subtotal = useMemo(
    () => purchasableItems.reduce((sum, row) => sum + row.lineTotal, 0),
    [purchasableItems],
  );

  const totalSaving = useMemo(() => {
    return purchasableItems.reduce((sum, row) => {
      if (row.compareAt == null || row.compareAt <= row.price) return sum;
      return sum + (row.compareAt - row.price) * row.quantity;
    }, 0);
  }, [purchasableItems]);

  async function withBusy<T>(productId: string, fn: () => Promise<T>) {
    if (busyRef.current.has(productId)) return;
    busyRef.current.add(productId);
    setBusyIds(new Set(busyRef.current));
    try {
      return await fn();
    } finally {
      busyRef.current.delete(productId);
      setBusyIds(new Set(busyRef.current));
      await load({ silent: true });
    }
  }

  async function onCheckout() {
    if (checkoutCount <= 0) return;
    setCheckoutLoading(true);
    try {
      void CART_CHECKOUT_TRANSITION_LOADING_LABEL;
      router.push("/checkout");
    } finally {
      setTimeout(() => setCheckoutLoading(false), 1200);
    }
  }

  if (loading && items.length === 0 && !error) {
    return (
      <View style={styles.screen}>
        <CartHeader />
        <CartSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CartHeader />

      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Не удалось загрузить корзину</Text>
          <Pressable style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Повторить</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <>
          <CartTitleRow itemCount={0} />
          <CartEmptyState onCatalog={() => router.push("/(tabs)/catalog")} />
        </>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load({ silent: true }); }} />}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: cartCheckoutBarInset(insets.bottom, totalSaving > 0) },
            ]}
          >
            <CartTitleRow itemCount={itemCount} />

            <View style={styles.items}>
              {items.map((item) => (
                <CartItemCard
                  key={item.productId}
                  item={item}
                  isFavorite={isFavorite(item.productId)}
                  busy={busyIds.has(item.productId)}
                  onPress={() => router.push(`/product/${item.productId}`)}
                  onToggleFavorite={() => void toggleProductFavorite(item.productId)}
                  onRemove={() => void withBusy(item.productId, () => decrementProductCart(item.productId))}
                  onIncrement={() => void withBusy(item.productId, () => incrementProductCart(item.productId))}
                  onDecrement={() => void withBusy(item.productId, () => decrementProductCart(item.productId))}
                />
              ))}
            </View>

            <CartDeliveryCard />
          </ScrollView>

          <CartCheckoutBar
            itemCount={checkoutCount}
            subtotal={subtotal}
            totalSaving={totalSaving}
            loading={checkoutLoading}
            disabled={checkoutCount <= 0}
            onCheckout={() => void onCheckout()}
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
  items: {
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: colors.black,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.ctaPrimary,
  },
  retryText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.white,
  },
});
