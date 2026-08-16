import { useEffect, useState } from "react";
import { Animated, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { fetchOrders } from "../../src/api/endpoints";
import { Badge, EmptyState, PageContainer, SkeletonGrid } from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

export default function OrdersScreen() {
  const fade = useFadeIn();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetchOrders()
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

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
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState preset="orders" actionLabel="Обновить" onAction={load} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>Заказ #{String(item.number ?? item.id ?? "—")}</Text>
                <Badge label={String(item.status ?? "NEW")} tone="neutral" />
              </View>
              <Text style={styles.caption}>{formatOrderMeta(item)}</Text>
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
  card: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typography.subtitle, color: colors.black },
  caption: { ...typography.caption, color: colors.gray500 },
});
