import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchCatalog, fetchCategories, type MobileProductListItem } from "../../src/api/endpoints";
import { selectRailCategories } from "../../src/catalog/rail-categories";
import {
  CatalogCategoryRow,
  CatalogFilterBar,
  CatalogLoadMore,
  CatalogProductCard,
  CatalogSearchRow,
  CatalogSkeletonGrid,
  CatalogTitleRow,
  CATALOG_GRID_GAP,
  CATALOG_SCREEN_PADDING,
} from "../../src/catalog/ui";
import { EmptyState, ErrorState, type CatalogSort } from "../../src/components/ui";
import { HomeHeader } from "../../src/home";
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { pushSearchHistory } from "../../src/storage/search-history";
import { discountPercent } from "../../src/utils/format";
import { colors } from "../../src/theme/tokens";

const SORT_VALUES = new Set<CatalogSort>(["popular", "newest", "price_asc", "price_desc"]);

function parseSort(value: unknown): CatalogSort {
  return typeof value === "string" && SORT_VALUES.has(value as CatalogSort) ? (value as CatalogSort) : "popular";
}

function resolveCategoryFromList(
  categoryId: string,
  list: Array<{ id: string; name: string }>,
): { id: string; name: string } {
  const match = list.find((c) => c.id === categoryId);
  return match ? { id: match.id, name: match.name } : { id: categoryId, name: "Категория" };
}

export default function CatalogScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    categoryId?: string;
    sort?: string;
    sellerId?: string;
    sellerName?: string;
    deals?: string;
    focusSearch?: string;
  }>();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);
  const { addProductToCart, incrementProductCart, decrementProductCart, toggleProductFavorite, isFavorite } = useCommerceActions();

  const [q, setQ] = useState(typeof params.q === "string" ? params.q : "");
  const [sort, setSort] = useState<CatalogSort>(parseSort(params.sort));
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(params.deals === "1");
  const [category, setCategory] = useState<{ id: string; name: string } | null>(
    typeof params.categoryId === "string" ? resolveCategoryFromList(params.categoryId, []) : null,
  );
  const [sellerFilter, setSellerFilter] = useState<{ id: string; name: string } | null>(
    typeof params.sellerId === "string"
      ? { id: params.sellerId, name: typeof params.sellerName === "string" ? params.sellerName : "Продавец" }
      : null,
  );
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string; slug?: string; catalogProductCount?: number; productCount?: number }>>([]);
  const railCategories = useMemo(() => selectRailCategories(allCategories), [allCategories]);
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then((res) => {
        const list = res.items;
        setAllCategories(list);
        if (typeof params.categoryId === "string") {
          setCategory(resolveCategoryFromList(params.categoryId, list));
        }
      })
      .catch(() => null);
  }, [params.categoryId]);

  useFocusEffect(
    useCallback(() => {
      if (typeof params.categoryId === "string") {
        setCategory((prev) => {
          const resolved = resolveCategoryFromList(params.categoryId!, allCategories);
          if (prev?.id === resolved.id && prev?.name === resolved.name) return prev;
          return resolved;
        });
        setQ("");
        setSellerFilter(null);
        if (params.deals !== "1") setDealsOnly(false);
      } else if (typeof params.q === "string" && params.q.length > 0) {
        setQ(params.q);
        setCategory(null);
      }
      if (typeof params.sort === "string") setSort(parseSort(params.sort));
      if (params.deals === "1") setDealsOnly(true);
      if (typeof params.sellerId === "string") {
        setSellerFilter({
          id: params.sellerId,
          name: typeof params.sellerName === "string" ? params.sellerName : "Продавец",
        });
        setCategory(null);
        setQ("");
      }
    }, [params.categoryId, params.q, params.sort, params.deals, params.sellerId, params.sellerName, allCategories]),
  );

  useEffect(() => {
    if (params.focusSearch === "1") {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [params.focusSearch]);

  const load = useCallback(
    async (reset = true) => {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await fetchCatalog({
          q: q.trim() || undefined,
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
      } catch (err) {
        if (reset) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [q, cursor, sort, category?.id, sellerFilter?.id, inStockOnly, dealsOnly],
  );

  useEffect(() => {
    setCursor(null);
    load(true);
  }, [q, sort, category?.id, sellerFilter?.id, inStockOnly, dealsOnly]);

  async function submitSearch(value: string) {
    setCategory(null);
    setSellerFilter(null);
    setDealsOnly(false);
    setQ(value);
    await pushSearchHistory(value);
  }

  function clearFilters() {
    setQ("");
    setCategory(null);
    setSellerFilter(null);
    setInStockOnly(false);
    setDealsOnly(false);
    setSort("popular");
    setCursor(null);
  }

  function catalogEmptyPreset(): "catalog" | "catalogCategory" | "catalogSearch" {
    if (q.trim()) return "catalogSearch";
    if (category) return "catalogCategory";
    return "catalog";
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <HomeHeader />
      <CatalogSearchRow
        inputRef={searchInputRef}
        value={q}
        onChangeText={setQ}
        onSubmit={() => submitSearch(q)}
        onFilterPress={() => setFiltersOpen(true)}
      />
      <CatalogCategoryRow
        activeCategoryId={category?.id ?? null}
        categories={railCategories}
        onSelect={(cat) => {
          setCategory(cat);
          setSellerFilter(null);
          setDealsOnly(false);
          if (cat) setQ("");
          else clearFilters();
        }}
      />
      <CatalogTitleRow count={items.length} hasMore={hasMore} />
      <CatalogFilterBar
        sort={sort}
        onSortChange={setSort}
        dealsOnly={dealsOnly}
        onDealsChange={setDealsOnly}
        inStockOnly={inStockOnly}
        onInStockChange={setInStockOnly}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        categoryName={category?.name ?? sellerFilter?.name ?? null}
        onClearCategory={() => {
          setCategory(null);
          setSellerFilter(null);
        }}
        onResetFilters={clearFilters}
      />
      {error && items.length === 0 ? (
        <ErrorState title="Не удалось загрузить товары" onRetry={() => load(true)} variant="network" />
      ) : null}
      {loading && items.length === 0 ? <CatalogSkeletonGrid count={6} /> : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={loading && items.length === 0 ? [] : items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={() => load(true)} tintColor={colors.ctaPrimary} />}
        renderItem={({ item }) => (
          <CatalogProductCard
            product={item}
            isFavorite={isFavorite(item.id)}
            onPress={() => router.push(`/product/${item.id}`)}
            onFavorite={() => toggleProductFavorite(item.id)}
            onAddToCart={() => addProductToCart(item.id, 1)}
            onIncrementCart={() => incrementProductCart(item.id)}
            onDecrementCart={() => decrementProductCart(item.id)}
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState preset={catalogEmptyPreset()} actionLabel="Сбросить фильтры" onAction={clearFilters} />
          ) : null
        }
        ListFooterComponent={
          hasMore && items.length > 0 ? (
            <CatalogLoadMore loading={loadingMore} onPress={() => load(false)} />
          ) : (
            <View style={styles.footerSpacer} />
          )
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore && !loading && !loadingMore) load(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerBlock: {
    gap: 14,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  list: {
    paddingHorizontal: CATALOG_SCREEN_PADDING,
    flexGrow: 1,
  },
  row: {
    gap: CATALOG_GRID_GAP,
    marginBottom: CATALOG_GRID_GAP,
  },
  footerSpacer: {
    height: 8,
  },
});
