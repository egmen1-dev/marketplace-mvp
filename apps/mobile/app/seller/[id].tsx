import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { fetchCatalog, type MobileProductListItem } from "../../src/api/endpoints";
import { EmptyState, PageContainer, ProductCard, SkeletonGrid } from "../../src/components/ui";
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { openSellerStorefront } from "../../src/navigation/seller-routes";
import { spacing, typography, colors } from "../../src/theme/tokens";

export default function SellerStorefrontScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const sellerId = typeof params.id === "string" ? params.id : "";
  const sellerName = typeof params.name === "string" ? params.name : "Продавец";
  const { addProductToCart, toggleProductFavorite, isFavorite } = useCommerceActions();
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const res = await fetchCatalog({ sellerId, sort: "popular" });
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!sellerId) {
    return (
      <PageContainer style={styles.container}>
        <EmptyState preset="catalog" title="Продавец не найден" actionLabel="В каталог" onAction={() => router.replace("/(tabs)/catalog")} />
      </PageContainer>
    );
  }

  return (
    <PageContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{sellerName}</Text>
        <Text style={styles.subtitle}>Товары продавца</Text>
      </View>

      {loading && items.length === 0 ? (
        <SkeletonGrid count={4} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={
            !loading ? (
              <EmptyState preset="catalog" title="У продавца пока нет товаров" actionLabel="В каталог" onAction={() => router.back()} />
            ) : null
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              width="48%"
              isFavorite={isFavorite(item.id)}
              onPress={() => router.push(`/product/${item.id}`)}
              onFavorite={() => toggleProductFavorite(item.id)}
              onAddToCart={() => addProductToCart(item.id, 1)}
              onSellerPress={() => openSellerStorefront(item.seller?.id ?? sellerId, item.seller?.storeName)}
            />
          )}
        />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.black },
  subtitle: { ...typography.caption, color: colors.gray500 },
  list: { paddingBottom: spacing.xxl, gap: spacing.md },
  row: { justifyContent: "space-between", marginBottom: spacing.md },
});
