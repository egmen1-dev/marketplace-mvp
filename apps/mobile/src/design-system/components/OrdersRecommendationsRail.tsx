import { router } from "expo-router";
import { memo, useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CatalogProductCard } from "./CatalogProductCard";
import { CommerceSectionHeader } from "./CommerceSectionHeader";
import { SectionErrorCard } from "./SectionErrorCard";
import { toggleFavorite, type MobileProductListItem } from "../../api/endpoints";
import { spacing } from "../tokens/spacing";

type Props = {
  items: MobileProductListItem[];
  failed: boolean;
  onRetry?: () => void;
};

export const OrdersRecommendationsRail = memo(function OrdersRecommendationsRail({ items, failed, onRetry }: Props) {
  const onFavorite = useCallback((id: string) => toggleFavorite(id), []);

  if (failed) {
    return (
      <View style={styles.wrap}>
        <CommerceSectionHeader title="Вам может понравиться" />
        <SectionErrorCard message="Не удалось загрузить рекомендации" onRetry={onRetry} />
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <CommerceSectionHeader title="Вам может понравиться" subtitle="Популярное в каталоге" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {items.map((item) => (
          <View key={item.id} style={styles.cardWrap}>
            <CatalogProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onFavorite={() => onFavorite(item.id)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  rail: { gap: spacing.md, paddingVertical: spacing.xs },
  cardWrap: { width: 168 },
});
