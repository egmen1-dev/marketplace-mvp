import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, RefreshControl, StyleSheet, TextInput, View } from "react-native";

import { fetchCatalog, fetchCategories, type MobileProductListItem } from "../../src/api/endpoints";
import { selectRailCategories } from "../../src/catalog/rail-categories";
import { CommerceHeader } from "../../src/components/CommerceHeader";
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
  const searchInputRef = useRef<TextInput>(null);
  const fade = useFadeIn();
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
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string; catalogProductCount?: number; productCount?: number }>>([]);
  const railCategories = useMemo(() => selectRailCategories(allCategories), [allCategories]);
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
      setSearchFocused(true);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [params.focusSearch]);

  const load = useCallback(
    async (reset = true) => {
      setLoading(true);
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
      } finally {
        setLoading(false);
      }
    },
    [q, cursor, sort, category?.id, sellerFilter?.id, inStockOnly, dealsOnly],
  );

  useEffect(() => {
    setCursor(null);
    load(true);
  }, [q, sort, category?.id, sellerFilter?.id, inStockOnly, dealsOnly]);

  const activeFiltersLabel = useMemo(() => {
    const parts: string[] = [];
    if (sellerFilter) parts.push(sellerFilter.name);
    if (dealsOnly) parts.push("Скидки");
    return parts.join(" · ");
  }, [sellerFilter, dealsOnly]);

  async function submitSearch(value: string) {
    setCategory(null);
    setSellerFilter(null);
    setDealsOnly(false);
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
    setCursor(null);
  }

  function catalogEmptyPreset(): "catalog" | "catalogCategory" | "catalogSearch" {
    if (q.trim()) return "catalogSearch";
    if (category) return "catalogCategory";
    return "catalog";
  }

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, gap: spacing.sm, flex: 1 }}>
        <CommerceHeader compact />
        <CommerceSearchBar
          inputRef={searchInputRef}
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
          categories={railCategories}
          activeId={category?.id ?? null}
          onSelect={(cat) => {
            setCategory(cat);
            setSellerFilter(null);
            setDealsOnly(false);
            if (cat) setQ("");
            else clearFilters();
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
          onClearCategory={() => setCategory(null)}
          onResetFilters={clearFilters}
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
              <View style={styles.cardCell}>
                <ProductCard
                  product={item}
                  width="100%"
                  isFavorite={isFavorite(item.id)}
                  onPress={() => router.push(`/product/${item.id}`)}
                  onFavorite={() => toggleProductFavorite(item.id)}
                  onAddToCart={() => addProductToCart(item.id, 1)}
                  onIncrementCart={() => incrementProductCart(item.id)}
                  onDecrementCart={() => decrementProductCart(item.id)}
                  onSellerPress={
                    item.seller?.id
                      ? () => openSellerStorefront(item.seller!.id!, item.seller?.storeName)
                      : undefined
                  }
                />
              </View>
            )}
            ListEmptyComponent={
              !loading ? (
                <EmptyState preset={catalogEmptyPreset()} actionLabel="Сбросить фильтры" onAction={clearFilters} />
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
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 0 },
  list: { paddingBottom: spacing.xxl, gap: spacing.md },
  row: { justifyContent: "space-between", alignItems: "stretch", marginBottom: spacing.md },
  cardCell: { width: "48%" },
});
