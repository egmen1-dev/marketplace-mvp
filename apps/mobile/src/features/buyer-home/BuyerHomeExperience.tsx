import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { addToCart, toggleFavorite, type MobileProductListItem } from "../../api/endpoints";
import {
  CommerceSearchBar,
  HomeSectionSkeleton,
  PageScroll,
  POPULAR_SEARCHES,
  ProductCard,
  ShimmerBlock,
} from "../../components/ui";
import { BuyerHomeHeader } from "../../design-system/components/BuyerHomeHeader";
import { CategoryRail, CategoryRailSkeleton } from "../../design-system/components/CategoryRail";
import { CommerceSectionHeader } from "../../design-system/components/CommerceSectionHeader";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { brand, surface, text } from "../../design-system/tokens/colors";
import { layout } from "../../design-system/tokens/layout";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { useFadeIn } from "../../hooks/useFadeIn";
import { clearSearchHistory, loadSearchHistory, pushSearchHistory } from "../../storage/search-history";
import { useAppStore } from "../../store/app-store";
import type { BuyerHomeData, CategoryItem, SectionLoadState } from "./useBuyerHomeData";

type ProductSectionProps = {
  title: string;
  subtitle?: string;
  section: SectionLoadState<MobileProductListItem[]>;
  horizontal?: boolean;
  onMore?: () => void;
  onRetry?: () => void;
  hideWhenEmpty?: boolean;
  fade: Animated.Value;
};

function ProductRailSection({
  title,
  subtitle,
  section,
  horizontal = true,
  onMore,
  onRetry,
  hideWhenEmpty,
  fade,
}: ProductSectionProps) {
  if (hideWhenEmpty && !section.loading && section.data.length === 0 && !section.error) {
    return null;
  }

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title={title} subtitle={subtitle} onAction={onMore} />
      {section.loading ? <HomeSectionSkeleton /> : null}
      {section.error ? <SectionErrorCard message={section.error} onRetry={onRetry} /> : null}
      {!section.loading && !section.error && section.data.length === 0 ? null : null}
      {!section.loading && !section.error && section.data.length > 0 ? (
        horizontal ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {section.data.map((item) => (
              <ProductCard
                key={`${title}-${item.id}`}
                product={item}
                compact
                width={168}
                onPress={() => router.push(`/product/${item.id}`)}
                onFavorite={() => toggleFavorite(item.id)}
                onAddToCart={() => addToCart(item.id, 1)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.grid}>
            {section.data.map((item) => (
              <ProductCard
                key={`${title}-${item.id}`}
                product={item}
                onPress={() => router.push(`/product/${item.id}`)}
                onFavorite={() => toggleFavorite(item.id)}
                onAddToCart={() => addToCart(item.id, 1)}
              />
            ))}
          </View>
        )
      ) : null}
    </Animated.View>
  );
}

function BuyerHomeSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <ShimmerBlock height={52} width="100%" />
      <CategoryRailSkeleton />
      <HomeSectionSkeleton />
      <HomeSectionSkeleton />
    </View>
  );
}

export function BuyerHomeExperience(props: BuyerHomeData) {
  const insets = useSafeAreaInsets();
  const fade = useFadeIn(280);
  const cartCount = useAppStore((s) => s.badges.cart);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    loadSearchHistory().then(setHistory);
  }, []);

  async function submitSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = await pushSearchHistory(trimmed);
    setHistory(next);
    router.push({ pathname: "/(tabs)/catalog", params: { q: trimmed } });
  }

  function openCatalog(params?: Record<string, string>) {
    router.push({ pathname: "/(tabs)/catalog", params });
  }

  function onCategorySelect(cat: CategoryItem) {
    openCatalog({ categoryId: cat.id, q: cat.name });
  }

  if (props.initialLoading && props.categories.loading && props.popular.loading) {
    return (
      <PageScroll>
        <BuyerHomeSkeleton />
      </PageScroll>
    );
  }

  const coldStartFallback =
    !props.recommended.loading &&
    !props.popular.loading &&
    props.recommended.data.length === 0 &&
    props.popular.data.length === 0;

  return (
    <PageScroll
      refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.refresh} tintColor={brand.primary} />}
      contentContainerStyle={{ paddingTop: spacing.sm }}
    >
      <Animated.View style={{ opacity: fade, gap: spacing.lg }}>
        <BuyerHomeHeader cartCount={cartCount} onCartPress={() => router.push("/cart")} />

        <CommerceSearchBar
          placeholder="Искать товары, бренды, категории"
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          onSubmitEditing={() => submitSearch(search)}
          onClear={() => setSearch("")}
          history={history}
          popular={POPULAR_SEARCHES}
          showSuggestions={searchFocused}
          onSelectSuggestion={submitSearch}
          onClearHistory={async () => {
            await clearSearchHistory();
            setHistory([]);
          }}
        />

        {props.offline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>Оффлайн — некоторые разделы могут быть недоступны</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <CommerceSectionHeader title="Категории" subtitle="Быстрый вход в каталог" onAction={() => openCatalog()} />
          {props.categories.loading ? <CategoryRailSkeleton /> : null}
          {props.categories.error ? (
            <SectionErrorCard message={props.categories.error} onRetry={props.retryCategories} />
          ) : null}
          {!props.categories.loading && !props.categories.error ? (
            <CategoryRail categories={props.categories.data} onSelect={onCategorySelect} />
          ) : null}
        </View>

        <ProductRailSection
          title="Рекомендуем посмотреть"
          subtitle="Подборка на основе популярных товаров"
          section={props.recommended}
          onMore={() => openCatalog()}
          onRetry={props.retryPopular}
          fade={fade}
        />

        <ProductRailSection
          title="Популярное сейчас"
          subtitle="Часто выбирают другие покупатели"
          section={props.popular}
          horizontal={false}
          onMore={() => openCatalog({ sort: "popular" })}
          onRetry={props.retryPopular}
          fade={fade}
        />

        <ProductRailSection
          title="Новинки"
          subtitle="Недавно добавленные товары"
          section={props.newest}
          onMore={() => openCatalog({ sort: "newest" })}
          onRetry={props.retryNewest}
          fade={fade}
        />

        <ProductRailSection
          title="Вы недавно смотрели"
          section={props.recent}
          hideWhenEmpty
          onMore={() => openCatalog()}
          onRetry={props.retryRecent}
          fade={fade}
        />

        <ProductRailSection
          title="Выгодные предложения"
          subtitle="Товары со скидкой"
          section={props.deals}
          hideWhenEmpty
          onMore={() => openCatalog()}
          onRetry={props.retryPopular}
          fade={fade}
        />

        {coldStartFallback ? (
          <View style={styles.coldStart}>
            <CommerceSectionHeader
              title="Начните с каталога"
              subtitle="Откройте каталог или выберите категорию выше"
              actionLabel="В каталог"
              onAction={() => openCatalog()}
            />
          </View>
        ) : null}

        <View style={{ height: insets.bottom > 0 ? spacing.sm : spacing.lg }} />
      </Animated.View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  skeletonWrap: { gap: spacing.lg },
  horizontalList: { gap: spacing.md, paddingRight: spacing.lg },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.md,
  },
  offlineBanner: {
    padding: spacing.md,
    borderRadius: layout.pagePadding,
    backgroundColor: surface.backgroundMuted,
  },
  offlineText: { ...typography.caption, color: text.muted },
  coldStart: {
    padding: spacing.lg,
    borderRadius: layout.pagePadding,
    backgroundColor: brand.primarySoft,
  },
});
