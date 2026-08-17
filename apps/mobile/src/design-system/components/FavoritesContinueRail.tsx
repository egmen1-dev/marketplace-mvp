import { router } from "expo-router";
import { memo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CatalogProductCard } from "./CatalogProductCard";
import { CommerceSectionHeader } from "./CommerceSectionHeader";
import type { MobileProductListItem } from "../../api/endpoints";
import { spacing } from "../tokens/spacing";

type Props = {
  items: MobileProductListItem[];
};

export const FavoritesContinueRail = memo(function FavoritesContinueRail({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <CommerceSectionHeader title="Продолжить покупки" subtitle="Недавно просмотренные" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {items.map((item) => (
          <View key={item.id} style={styles.cardWrap}>
            <CatalogProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
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
