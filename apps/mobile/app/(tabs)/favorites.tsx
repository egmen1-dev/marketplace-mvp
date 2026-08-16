import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { fetchFavorites } from "../../src/api/endpoints";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function FavoritesScreen() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites()
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.orange} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item, idx) => String(item.id ?? idx)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchFavorites().then((r) => setItems(r.items))} />}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text style={styles.empty}>Избранное пусто</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{String(item.title ?? "Товар")}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, backgroundColor: colors.white },
  card: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  title: { ...typography.body },
  empty: { textAlign: "center", color: colors.gray500, marginTop: spacing.lg },
});
