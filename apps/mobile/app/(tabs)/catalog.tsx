import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { fetchCatalog, toggleFavorite, type MobileProductListItem } from "../../src/api/endpoints";
import { EmptyState, LoadingState, PageContainer, ProductCard, SearchBar, SkeletonGrid } from "../../src/components/ui";
import { colors, spacing } from "../../src/theme/tokens";

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(typeof params.q === "string" ? params.q : "");
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (reset = true) => {
      setLoading(true);
      try {
        const res = await fetchCatalog({ q, cursor: reset ? null : cursor, sort: "popular" });
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [q, cursor],
  );

  useEffect(() => {
    load(true);
  }, [q]);

  return (
    <PageContainer style={styles.container}>
      <SearchBar placeholder="Поиск в каталоге" value={q} onChangeText={setQ} />
      {loading && items.length === 0 ? (
        <SkeletonGrid />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(true)} />}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onFavorite={() => toggleFavorite(item.id)}
            />
          )}
          ListEmptyComponent={
            !loading ? (
              <EmptyState title="Ничего не найдено" description="Попробуйте изменить запрос." actionLabel="Сбросить" onAction={() => setQ("")} />
            ) : null
          }
          onEndReached={() => hasMore && !loading && load(false)}
        />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  row: { justifyContent: "space-between", marginBottom: spacing.md },
});
