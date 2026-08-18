import { router } from "expo-router";
import { Animated, FlatList, RefreshControl, StyleSheet } from "react-native";

import { ProductCard } from "../../src/design-system/commerce/ProductCard";
import { PageContainer } from "../../src/design-system/layout/ScreenLayout";
import { EmptyState, SkeletonGrid } from "../../src/design-system/feedback/States";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useFavoritesData } from "../../src/features/favorites/useFavoritesData";
import { spacing } from "../../src/theme/tokens";

export default function FavoritesScreen() {
  const fade = useFadeIn();
  const { items, loading, refreshing, refresh } = useFavoritesData();

  if (loading && items.length === 0) {
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
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
