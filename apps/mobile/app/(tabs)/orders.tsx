import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { fetchOrders } from "../../src/api/endpoints";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function OrdersScreen() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders()
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.orange} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item, idx) => String(item.id ?? idx)}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text style={styles.empty}>Заказов пока нет</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>Заказ #{String(item.number ?? item.id ?? "—")}</Text>
          <Text style={styles.caption}>{String(item.status ?? "")}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, backgroundColor: colors.white },
  card: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  title: { ...typography.subtitle },
  caption: { ...typography.caption, color: colors.gray500 },
  empty: { textAlign: "center", color: colors.gray500, marginTop: spacing.lg },
});
