import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { fetchCatalog } from "../../src/api/endpoints";
import { getSessionMeta } from "../../src/storage/secure-session";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function SellerProductsScreen() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const meta = await getSessionMeta();
      if (!meta) return setLoading(false);
      const res = await fetchCatalog({ q: "" });
      setItems(res.items);
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.orange} />;

  return (
    <FlatList
      data={items.slice(0, 20)}
      keyExtractor={(item, idx) => String(item.id ?? idx)}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text style={styles.empty}>Нет товаров</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{String(item.title ?? "Товар")}</Text>
          <Text style={styles.caption}>{String(item.status ?? "ACTIVE")}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  card: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  title: { ...typography.subtitle },
  caption: { ...typography.caption, color: colors.gray500 },
  empty: { textAlign: "center", color: colors.gray500, marginTop: spacing.lg },
});
