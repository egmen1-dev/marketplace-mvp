import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, FlatList, RefreshControl, StyleSheet } from "react-native";

import { fetchFavorites } from "../../src/api/endpoints";
import { EmptyState, PageContainer, ProductCard, SkeletonGrid } from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import type { MobileProductListItem } from "../../src/api/endpoints";
import { spacing } from "../../src/theme/tokens";

export default function FavoritesScreen() {
  const fade = useFadeIn();
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetchFavorites()
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <PageContainer style={styles.container}>
        <SkeletonGrid count={4} />
      </PageContainer>
    );
  }

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, flex: 1 }}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState preset="favorites" actionLabel="В каталог" onAction={() => router.push("/(tabs)/catalog")} />
          }
          renderItem={({ item }) => (
            <ProductCard product={item} width="48%" isFavorite onPress={() => router.push(`/product/${item.id}`)} />
          )}
        />
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  list: { paddingBottom: spacing.xxl, gap: spacing.md },
  row: { justifyContent: "space-between", marginBottom: spacing.md },
});
