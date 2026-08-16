import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";

import { fetchFavorites } from "../../src/api/endpoints";
import { EmptyState, LoadingState, PageContainer, ProductCard } from "../../src/components/ui";
import { spacing } from "../../src/theme/tokens";
import type { MobileProductListItem } from "../../src/api/endpoints";

export default function FavoritesScreen() {
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetchFavorites()
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Загружаем избранное…" />;

  return (
    <PageContainer style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="Нет избранного"
            description="Сохраняйте понравившиеся товары, чтобы вернуться к ним позже."
            actionLabel="В каталог"
            onAction={() => router.push("/(tabs)/catalog")}
          />
        }
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
        )}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  row: { justifyContent: "space-between", marginBottom: spacing.md },
});
