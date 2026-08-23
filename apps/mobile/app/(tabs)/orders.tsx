import { useEffect, useState } from "react";
import { Animated, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { fetchOrders, fetchSellerHome } from "../../src/api/endpoints";
import { Badge, EmptyState, PageContainer, SectionHeader, SkeletonGrid } from "../../src/components/ui";
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
    void load();
  }, [sellerCapable]);

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
            У вас {sellerSummary.needAction} продаж требуют внимания — откройте «Продать → Заказы».
          </Text>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              preset="orders"
              title="Покупок пока нет"
              description="Когда вы оформите покупку, заказ появится здесь."
              actionLabel="Обновить"
              onAction={() => void load()}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/order/${String(item.id)}`)}
              accessibilityRole="button"
            >
              <View style={styles.cardHeader}>
                <Text style={styles.title}>Заказ №{String(item.orderNumber ?? item.id ?? "—")}</Text>
                <Badge label={String(item.status ?? "NEW")} tone="neutral" />
              </View>
              <Text style={styles.caption}>{formatOrderMeta(item)}</Text>
              <Text style={styles.link}>Открыть статус заказа →</Text>
            </Pressable>
          )}
        />
      </Animated.View>
    </PageContainer>
  );
}

function formatOrderMeta(item: Record<string, unknown>): string {
  const total = item.totalAmount ?? item.total;
  if (typeof total === "number") return `Сумма: ${total.toLocaleString("ru-RU")} ₽`;
  return "Нажмите, чтобы увидеть детали";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  sellerHint: { ...typography.caption, color: colors.gray700, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typography.subtitle, color: colors.black },
  caption: { ...typography.caption, color: colors.gray500 },
  link: { ...typography.caption, color: colors.orange, fontWeight: "600" },
});
