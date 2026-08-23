import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { fetchCatalog, fetchCategories, type MobileProductListItem } from "../../src/api/endpoints";
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
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { openSellerStorefront } from "../../src/navigation/seller-routes";
import { discountPercent } from "../../src/utils/format";
import {
  clearSearchHistory,
  loadSearchHistory,
  pushSearchHistory,
} from "../../src/storage/search-history";
import { spacing } from "../../src/theme/tokens";

const SORT_VALUES = new Set<CatalogSort>(["popular", "newest", "price_asc", "price_desc"]);

function parseSort(value: unknown): CatalogSort {
  return typeof value === "string" && SORT_VALUES.has(value as CatalogSort) ? (value as CatalogSort) : "popular";
}

export default function CatalogScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    categoryId?: string;
    sort?: string;
    sellerId?: string;
    sellerName?: string;
    deals?: string;
  }>();
  const fade = useFadeIn();
  const { addProductToCart, toggleProductFavorite, isFavorite } = useCommerceActions();
  const [q, setQ] = useState(typeof params.q === "string" ? params.q : "");
  const [sort, setSort] = useState<CatalogSort>(parseSort(params.sort));
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(params.deals === "1");
  const [category, setCategory] = useState<{ id: string; name: string } | null>(
    typeof params.categoryId === "string" ? { id: params.categoryId, name: "Категория" } : null,
  );
  const [sellerFilter, setSellerFilter] = useState<{ id: string; name: string } | null>(
    typeof params.sellerId === "string"
      ? { id: params.sellerId, name: typeof params.sellerName === "string" ? params.sellerName : "Продавец" }
      : null,
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
      .then((res) => {
        const list = res.items.slice(0, 12);
        setCategories(list);
        if (typeof params.categoryId === "string") {
          const match = list.find((c) => c.id === params.categoryId);
          if (match) setCategory({ id: match.id, name: match.name });
        }
      })
      .catch(() => null);
  }, [params.categoryId]);

  useEffect(() => {
    if (typeof params.sort === "string") setSort(parseSort(params.sort));
    if (params.deals === "1") setDealsOnly(true);
    if (typeof params.sellerId === "string") {
      setSellerFilter({
        id: params.sellerId,
        name: typeof params.sellerName === "string" ? params.sellerName : "Продавец",
      });
    }
  }, [params.sort, params.deals, params.sellerId, params.sellerName]);

  const load = useCallback(
    async (reset = true) => {
      setLoading(true);
      try {
        const res = await fetchCatalog({
          q,
          cursor: reset ? null : cursor,
          sort,
          categoryId: category?.id,
          sellerId: sellerFilter?.id,
          inStock: inStockOnly || undefined,
        });
        const nextItems = dealsOnly ? res.items.filter((item) => (discountPercent(item.price, item.compareAt) ?? 0) > 0) : res.items;
        setItems((prev) => (reset ? nextItems : [...prev, ...nextItems]));
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [q, cursor, sort, category?.id, sellerFilter?.id, inStockOnly, dealsOnly],
  );

  useEffect(() => {
    load(true);
  }, [q, sort, category?.id, sellerFilter?.id, inStockOnly, dealsOnly]);

  const activeFiltersLabel = useMemo(() => {
    const parts: string[] = [];
    if (sellerFilter) parts.push(sellerFilter.name);
    if (dealsOnly) parts.push("Скидки");
    return parts.join(" · ");
  }, [sellerFilter, dealsOnly]);

  async function submitSearch(value: string) {
    setQ(value);
    setSearchFocused(false);
    const next = await pushSearchHistory(value);
    setHistory(next);
  }

  function clearFilters() {
    setQ("");
    setCategory(null);
    setSellerFilter(null);
    setInStockOnly(false);
    setDealsOnly(false);
    setSort("popular");
  }

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, gap: spacing.sm, flex: 1 }}>
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
          onSelect={(cat) => {
            setCategory(cat);
            if (cat) setQ("");
          }}
        />

        <CatalogToolbar
          sort={sort}
          onSortChange={setSort}
          inStockOnly={inStockOnly}
          onInStockChange={setInStockOnly}
          dealsOnly={dealsOnly}
          onDealsChange={setDealsOnly}
          categoryName={(category?.name ?? activeFiltersLabel) || null}
          onClearCategory={() => {
            if (category) setCategory(null);
            else if (sellerFilter) setSellerFilter(null);
            else if (dealsOnly) setDealsOnly(false);
            else setInStockOnly(false);
          }}
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
                isFavorite={isFavorite(item.id)}
                onPress={() => router.push(`/product/${item.id}`)}
                onFavorite={() => toggleProductFavorite(item.id)}
                onAddToCart={() => addProductToCart(item.id, 1)}
                onSellerPress={
                  item.seller?.id
                    ? () => openSellerStorefront(item.seller!.id!, item.seller?.storeName)
                    : undefined
                }
              />
            )}
            ListEmptyComponent={
              !loading ? (
                <EmptyState preset="catalog" actionLabel="Сбросить фильтры" onAction={clearFilters} />
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
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { paddingBottom: spacing.xxl, gap: spacing.md },
  row: { justifyContent: "space-between", marginBottom: spacing.md },
});
