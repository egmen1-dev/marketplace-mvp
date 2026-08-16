import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Animated, FlatList, RefreshControl, StyleSheet, View } from "react-native";

import {
  addToCart,
  fetchCatalog,
  fetchCategories,
  toggleFavorite,
  type MobileProductListItem,
} from "../../src/api/endpoints";
import {
  CatalogToolbar,
  CategoryRail,
  CommerceSearchBar,
  EmptyState,
  PageContainer,
  POPULAR_SEARCHES,
  ProductCard,
  SkeletonGrid,
  type CatalogSort,
} from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import {
  clearSearchHistory,
  loadSearchHistory,
  pushSearchHistory,
} from "../../src/storage/search-history";
import { spacing } from "../../src/theme/tokens";

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ q?: string; categoryId?: string }>();
  const fade = useFadeIn();
  const [q, setQ] = useState(typeof params.q === "string" ? params.q : "");
  const [sort, setSort] = useState<CatalogSort>("popular");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [category, setCategory] = useState<{ id: string; name: string } | null>(
    typeof params.categoryId === "string" ? { id: params.categoryId, name: "Категория" } : null,
  );
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadSearchHistory().then(setHistory);
    fetchCategories()
      .then((res) => setCategories(res.items.slice(0, 12)))
      .catch(() => null);
  }, []);

  const load = useCallback(
    async (reset = true) => {
      setLoading(true);
      try {
        const res = await fetchCatalog({
          q,
          cursor: reset ? null : cursor,
          sort,
          categoryId: category?.id,
          inStock: inStockOnly || undefined,
        });
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [q, cursor, sort, category?.id, inStockOnly],
  );

  useEffect(() => {
    load(true);
  }, [q, sort, category?.id, inStockOnly]);

  async function submitSearch(value: string) {
    setQ(value);
    setSearchFocused(false);
    const next = await pushSearchHistory(value);
    setHistory(next);
  }

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, gap: spacing.md, flex: 1 }}>
        <CommerceSearchBar
          placeholder="Поиск товаров и категорий"
          value={q}
          onChangeText={setQ}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          onSubmitEditing={() => submitSearch(q)}
          onClear={() => setQ("")}
          history={history}
          popular={POPULAR_SEARCHES}
          showSuggestions={searchFocused}
          onSelectSuggestion={submitSearch}
          onClearHistory={async () => {
            await clearSearchHistory();
            setHistory([]);
          }}
        />

        <CategoryRail
          categories={categories}
          activeId={category?.id ?? null}
          onSelect={(cat) => setCategory(cat)}
        />

        <CatalogToolbar
          sort={sort}
          onSortChange={setSort}
          inStockOnly={inStockOnly}
          onInStockChange={setInStockOnly}
          categoryName={category?.name ?? null}
          onClearCategory={() => setCategory(null)}
        />

        {loading && items.length === 0 ? (
          <SkeletonGrid count={6} />
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
                width="48%"
                onPress={() => router.push(`/product/${item.id}`)}
                onFavorite={() => toggleFavorite(item.id)}
                onAddToCart={() => addToCart(item.id, 1)}
              />
            )}
            ListEmptyComponent={
              !loading ? (
                <EmptyState preset="catalog" actionLabel="Сбросить фильтры" onAction={() => { setQ(""); setCategory(null); setInStockOnly(false); }} />
              ) : null
            }
            onEndReached={() => hasMore && !loading && load(false)}
          />
        )}
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  list: { paddingBottom: spacing.xxl, gap: spacing.md },
  row: { justifyContent: "space-between", marginBottom: spacing.md },
});
