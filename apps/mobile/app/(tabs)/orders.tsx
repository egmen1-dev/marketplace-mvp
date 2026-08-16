import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { fetchOrders } from "../../src/api/endpoints";
import { Badge, EmptyState, LoadingState, PageContainer } from "../../src/components/ui";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

export default function OrdersScreen() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetchOrders()
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Загружаем заказы…" />;

  return (
    <PageContainer style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item, idx) => String(item.id ?? idx)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="Нет заказов" description="Оформите первый заказ в каталоге." actionLabel="Обновить" onAction={load} />
        }
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
    </PageContainer>
  );
}

function formatOrderMeta(item: Record<string, unknown>): string {
  const total = item.totalAmount ?? item.total;
  if (typeof total === "number") return `Сумма: ${total.toLocaleString("ru-RU")} ₽`;
  return "Детали заказа в приложении скоро";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typography.subtitle, color: colors.black },
  caption: { ...typography.caption, color: colors.gray500 },
});
