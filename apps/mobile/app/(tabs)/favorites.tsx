import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Animated, FlatList, RefreshControl, StyleSheet } from "react-native";

import { fetchFavorites, type MobileProductListItem } from "../../src/api/endpoints";
import { EmptyState, PageContainer, ProductCard, SkeletonGrid } from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { openSellerStorefront } from "../../src/navigation/seller-routes";
import { useFavoritesStore } from "../../src/commerce/favorites-store";
import { spacing } from "../../src/theme/tokens";

export default function FavoritesScreen() {
  const fade = useFadeIn();
  const { addProductToCart, incrementProductCart, decrementProductCart, toggleProductFavorite, isFavorite } = useCommerceActions();
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
              product={item}
              width="48%"
              isFavorite={isFavorite(item.id)}
              onPress={() => router.push(`/product/${item.id}`)}
              onFavorite={() => toggleProductFavorite(item.id).then(load)}
              onAddToCart={() => addProductToCart(item.id, 1)}
              onIncrementCart={() => incrementProductCart(item.id)}
              onDecrementCart={() => decrementProductCart(item.id)}
              onSellerPress={item.seller?.id ? () => openSellerStorefront(item.seller!.id!, item.seller?.storeName) : undefined}
            />
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
