import { useEffect, useState } from "react";
import { Animated, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { fetchOrder, fetchOrders, fetchSellerHome } from "../../src/api/endpoints";
import { Badge, EmptyState, PageContainer, SecondaryButton, SectionHeader, SkeletonGrid } from "../../src/components/ui";
import { openProductConversation } from "../../src/hooks/useChatActions";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

export default function OrdersScreen() {
  const fade = useFadeIn();
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [sellerSummary, setSellerSummary] = useState<{ needAction?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [orders, sellerHome] = await Promise.all([
        fetchOrders(),
        sellerCapable ? fetchSellerHome().catch(() => null) : Promise.resolve(null),
      ]);
      setItems(orders.items);
      setSellerSummary(sellerHome?.orders ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sellerCapable]);

  async function onWriteSeller(orderId: string) {
    try {
      const order = await fetchOrder(orderId);
      const items = (order.items as Array<{ productId?: string }> | undefined) ?? [];
      const productId = items.find((item) => item.productId)?.productId;
      if (productId) await openProductConversation(productId);
    } catch {
      // auth handled in hook
    }
  }

  if (loading) {
    return (
      <PageContainer style={styles.container}>
        <SkeletonGrid count={2} />
      </PageContainer>
    );
  }

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, flex: 1 }}>
        <SectionHeader title="Мои покупки" />
        {sellerCapable && sellerSummary?.needAction ? (
          <Text style={styles.sellerHint}>
            У вас {sellerSummary.needAction} продаж требуют внимания — откройте «Мои продажи» в профиле.
          </Text>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              preset="orders"
              title="Покупок пока нет"
              description="Когда вы оформите покупку, заказ появится здесь."
              actionLabel="Обновить"
              onAction={load}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>Заказ #{String(item.number ?? item.id ?? "—")}</Text>
                <Badge label={String(item.status ?? "NEW")} tone="neutral" />
              </View>
              <Text style={styles.caption}>{formatOrderMeta(item)}</Text>
              <SecondaryButton
                label="Написать продавцу"
                onPress={() => void onWriteSeller(String(item.id))}
                style={styles.chatBtn}
              />
            </View>
          )}
        />
      </Animated.View>
    </PageContainer>
  );
}

function formatOrderMeta(item: Record<string, unknown>): string {
  const total = item.totalAmount ?? item.total;
  if (typeof total === "number") return `Сумма: ${total.toLocaleString("ru-RU")} ₽`;
  return "Детали заказа доступны в веб-кабинете";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  sellerHint: { ...typography.caption, color: colors.gray700, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typography.subtitle, color: colors.black },
  caption: { ...typography.caption, color: colors.gray500 },
  chatBtn: { marginTop: spacing.xs },
});
