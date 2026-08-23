import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { fetchCatalog, fetchSellerStorefront, type MobileProductListItem } from "../../src/api/endpoints";
import { EmptyState, PageContainer, ProductCard, SecondaryButton, SkeletonGrid } from "../../src/components/ui";
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { openSellerConversationFromStorefront } from "../../src/hooks/useChatActions";
import { openSellerStorefront } from "../../src/navigation/seller-routes";
import { spacing, typography, colors, radii } from "../../src/theme/tokens";

export default function SellerStorefrontScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const sellerId = typeof params.id === "string" ? params.id : "";
  const fallbackName = typeof params.name === "string" ? params.name : "Продавец";
  const { addProductToCart, incrementProductCart, decrementProductCart, toggleProductFavorite, isFavorite } = useCommerceActions();
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [trust, setTrust] = useState<{
    storeName: string;
    kindLabel: string;
    badges: string[];
    activeProducts: number;
    joinedLabel: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const [res, profile] = await Promise.all([
        fetchCatalog({ sellerId, sort: "popular" }),
        fetchSellerStorefront(sellerId).catch(() => null),
      ]);
      setItems(res.items);
      if (profile) {
        setTrust({
          storeName: profile.storeName,
          kindLabel: profile.kindLabel,
          badges: profile.badges,
          activeProducts: profile.activeProducts,
          joinedLabel: profile.joinedLabel,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!sellerId) {
    return (
      <PageContainer style={styles.container}>
        <EmptyState preset="catalog" title="Продавец не найден" actionLabel="В каталог" onAction={() => router.replace("/(tabs)/catalog")} />
      </PageContainer>
    );
  }

  const title = trust?.storeName ?? fallbackName;

  return (
    <PageContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Продавец</Text>
        <Text style={styles.title}>{title}</Text>
        {trust ? (
          <View style={styles.trustBlock}>
            <Text style={styles.kind}>{trust.kindLabel}</Text>
            {trust.badges.length > 0 ? (
              <Text style={styles.badge}>⭐ {trust.badges[0]}</Text>
            ) : (
              <Text style={styles.badge}>⭐ Новый продавец</Text>
            )}
            <Text style={styles.meta}>
              {trust.activeProducts > 0
                ? `${trust.activeProducts} товаров`
                : "Товары появятся скоро"}
            </Text>
            {trust.joinedLabel ? <Text style={styles.meta}>{trust.joinedLabel}</Text> : null}
            <Text style={styles.meta}>Ответы в чате</Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>Товары продавца</Text>
        )}
        {items.length > 0 ? (
          <SecondaryButton
            label="Написать продавцу"
            onPress={() => void openSellerConversationFromStorefront(items).catch(() => null)}
          />
        ) : null}
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
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
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
              onIncrementCart={() => incrementProductCart(item.id)}
              onDecrementCart={() => decrementProductCart(item.id)}
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
  eyebrow: { ...typography.caption, color: colors.gray500, textTransform: "uppercase" },
  title: { ...typography.h1, color: colors.black },
  subtitle: { ...typography.caption, color: colors.gray500 },
  trustBlock: {
    backgroundColor: colors.gray100,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  kind: { ...typography.body, color: colors.gray700 },
  badge: { ...typography.subtitle, color: colors.black },
  meta: { ...typography.body, color: colors.gray700 },
  list: { paddingBottom: spacing.xxl, gap: spacing.md },
  row: { justifyContent: "space-between", marginBottom: spacing.md },
});
