import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Animated, FlatList, RefreshControl, StyleSheet } from "react-native";

import { fetchFavorites, type MobileProductListItem } from "../../src/api/endpoints";
import { CATALOG_GRID_GAP, CATALOG_SCREEN_PADDING } from "../../src/catalog/ui/constants";
import { ProductCard } from "../../src/commerce/product-card";
import { EmptyState, PageContainer, SkeletonGrid } from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { useFavoritesStore } from "../../src/commerce/favorites-store";
import { spacing } from "../../src/theme/tokens";

export default function FavoritesScreen() {
  const fade = useFadeIn();
  const {
    addProductToCart,
    incrementProductCart,
    decrementProductCart,
    toggleProductFavorite,
    isFavorite,
    isFavoriteBusy,
    isCartBusy,
  } = useCommerceActions();
  const setAll = useFavoritesStore((s) => s.setAll);
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return fetchFavorites()
      .then((res) => {
        setItems(res.items);
        setAll(res.items.map((i) => i.id));
      })
      .finally(() => setLoading(false));
  }, [setAll]);

  useEffect(() => {
    load();
  }, [load]);

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
            <ProductCard
              variant="grid"
              product={item}
              isFavorite={isFavorite(item.id)}
              isFavoriteBusy={isFavoriteBusy(item.id)}
              isCartBusy={isCartBusy(item.id)}
              onPress={() => router.push(`/product/${item.id}`)}
              onFavorite={() => toggleProductFavorite(item.id).then(load)}
              onAddToCart={() => addProductToCart(item.id, 1)}
              onIncrementCart={() => incrementProductCart(item.id)}
              onDecrementCart={() => decrementProductCart(item.id)}
            />
          )}
        />
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: CATALOG_SCREEN_PADDING, paddingTop: spacing.lg },
  list: { paddingBottom: spacing.xxl, gap: CATALOG_GRID_GAP },
  row: { justifyContent: "space-between", marginBottom: CATALOG_GRID_GAP },
});
