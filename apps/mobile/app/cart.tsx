import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

import { fetchCart, removeCartItem, updateCartQuantity } from "../src/api/endpoints";
import { loadAppConfig } from "../src/config/env";
import { refreshTabBadges } from "../src/commerce/refresh-tab-badges";
import { EmptyState, PrimaryButton, SkeletonGrid } from "../src/components/ui";
import { useFadeIn } from "../src/hooks/useFadeIn";
import { useAppStore } from "../src/store/app-store";
import { formatPrice, resolveImageUrl } from "../src/utils/format";
import { colors, layout, radii, spacing, typography } from "../src/theme/tokens";

type CartItem = {
  productId: string;
  quantity: number;
  product?: { id?: string; title?: string; price?: number; primaryImage?: { url?: string } | null };
  lineTotal?: number;
};

export default function CartScreen() {
  const fade = useFadeIn();
  const config = loadAppConfig();
  const offline = useAppStore((s) => s.offline);
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (offline) {
      setError("Для этого действия требуется интернет");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const cart = await fetchCart();
      const cartItems = (cart.items ?? []) as CartItem[];
      setItems(cartItems);
      setTotal(Number(cart.subtotal ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка корзины");
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRemove(productId: string) {
    if (offline) return;
    await removeCartItem(productId);
    await load();
    await refreshTabBadges();
  }

  async function onQty(productId: string, quantity: number) {
    if (offline) return;
    await updateCartQuantity(productId, quantity);
    await load();
    await refreshTabBadges();
  }

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <SkeletonGrid count={2} />
      </View>
    );
  }

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={styles.container}>
      <Animated.View style={{ opacity: fade, gap: spacing.md }}>
        <Text style={styles.title}>Корзина</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {items.length === 0 ? (
          <EmptyState preset="cart" actionLabel="В каталог" onAction={() => router.push("/(tabs)/catalog")} />
        ) : (
          items.map((item) => {
            const imageUrl = resolveImageUrl(item.product?.primaryImage?.url ?? null, config.apiBaseUrl);
            return (
            <View key={item.productId} style={styles.row}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" transition={200} />
              ) : (
                <View style={styles.thumbFallback}>
                  <Text style={styles.thumbFallbackText}>📦</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.product?.title ?? "Товар"}</Text>
                <Text style={styles.itemPrice}>{formatPrice(item.product?.price ?? 0)}</Text>
              </View>
              <Pressable style={styles.qtyBtn} onPress={() => onQty(item.productId, Math.max(1, item.quantity - 1))}>
                <Text>−</Text>
              </Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => onQty(item.productId, item.quantity + 1)}>
                <Text>+</Text>
              </Pressable>
              <Pressable style={styles.remove} onPress={() => onRemove(item.productId)}>
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
            );
          })
        )}
        {items.length > 0 ? (
          <>
            <Text style={styles.total}>Итого: {formatPrice(total)}</Text>
            <PrimaryButton label="Оформить заказ" fullWidth onPress={() => router.push("/checkout")} />
          </>
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: spacing.lg, backgroundColor: colors.white },
  container: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.h1 },
  error: { color: colors.danger },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  thumb: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.gray100 },
  thumbFallback: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  thumbFallbackText: { fontSize: 22 },
  itemTitle: { ...typography.subtitle },
  itemPrice: { ...typography.body, color: colors.orange },
  qtyBtn: { minWidth: layout.inputHeight, minHeight: layout.inputHeight, alignItems: "center", justifyContent: "center", backgroundColor: colors.gray100, borderRadius: radii.sm },
  qty: { minWidth: 24, textAlign: "center" },
  remove: { minWidth: layout.inputHeight, minHeight: layout.inputHeight, alignItems: "center", justifyContent: "center" },
  removeText: { color: colors.danger, fontSize: 18 },
  total: { ...typography.h2, marginTop: spacing.md },
});
