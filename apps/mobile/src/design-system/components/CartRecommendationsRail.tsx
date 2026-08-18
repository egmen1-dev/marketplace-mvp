import { router } from "expo-router";
import { memo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import type { MobileProductCardData } from "../commerce/ProductCard";
import { CatalogProductCard } from "./CatalogProductCard";
import { CommerceSectionHeader } from "./CommerceSectionHeader";
import { SectionErrorCard } from "./SectionErrorCard";
import { spacing } from "../tokens/spacing";

type Props = {
  items: MobileProductCardData[];
  failed: boolean;
  onRetry?: () => void;
  onToggleFavorite?: (productId: string) => void;
};

export const CartRecommendationsRail = memo(function CartRecommendationsRail({
  items,
  failed,
  onRetry,
  onToggleFavorite,
}: Props) {
  if (failed) {
    return (
      <View style={styles.wrap}>
        <CommerceSectionHeader title="Рекомендуем" subtitle="Популярное в каталоге" />
        <SectionErrorCard message="Не удалось загрузить рекомендации" onRetry={onRetry} />
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <CommerceSectionHeader title="Рекомендуем" subtitle="Популярное в каталоге" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {items.map((item) => (
          <View key={item.id} style={styles.cardWrap}>
            <CatalogProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onFavorite={onToggleFavorite ? () => onToggleFavorite(item.id) : undefined}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  rail: { gap: spacing.md, paddingRight: spacing.lg },
  cardWrap: { width: 168 },
});
