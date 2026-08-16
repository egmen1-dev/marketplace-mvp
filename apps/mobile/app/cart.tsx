import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { addToCart, fetchCart, removeCartItem, updateCartQuantity } from "../src/api/endpoints";
import { useAppStore } from "../src/store/app-store";
import { colors, spacing, typography } from "../src/theme/tokens";

type CartItem = {
  productId: string;
  quantity: number;
  product?: { id?: string; title?: string; price?: number };
  lineTotal?: number;
};

export default function CartScreen() {
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
    if (offline) {
      setError("Для этого действия требуется интернет");
      return;
    }
    await removeCartItem(productId);
    await load();
  }

  async function onQty(productId: string, quantity: number) {
    if (offline) {
      setError("Для этого действия требуется интернет");
      return;
    }
    await updateCartQuantity(productId, quantity);
    await load();
  }

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Корзина</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.length === 0 ? <Text style={styles.empty}>Корзина пуста</Text> : null}
      {items.map((item) => (
        <View key={item.productId} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{item.product?.title ?? "Товар"}</Text>
            <Text style={styles.itemPrice}>{item.product?.price ?? 0} ₽</Text>
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
      ))}
      {items.length > 0 ? (
        <>
          <Text style={styles.total}>Итого: {total} ₽</Text>
          <Pressable style={styles.checkout} onPress={() => router.push("/checkout")}>
            <Text style={styles.checkoutText}>Оформить заказ</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  container: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.title },
  error: { color: colors.danger },
  empty: { color: colors.gray500, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  itemTitle: { ...typography.subtitle },
  itemPrice: { ...typography.body, color: colors.orange },
  qtyBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.gray100, borderRadius: 8 },
  qty: { minWidth: 24, textAlign: "center" },
  remove: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  removeText: { color: colors.danger, fontSize: 18 },
  total: { ...typography.subtitle, marginTop: spacing.md },
  checkout: { backgroundColor: colors.orange, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  checkoutText: { color: colors.white, ...typography.subtitle },
});
