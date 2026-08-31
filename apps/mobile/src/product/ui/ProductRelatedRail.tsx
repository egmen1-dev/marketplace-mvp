import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { MobileProductListItem } from "../../api/endpoints";
import { HomeProductCard } from "../../home/HomeProductCard";
import { HOME_CARD_GAP } from "../../home/constants";
import { colors, spacing, typography } from "../../theme/tokens";
import { PRODUCT_SCREEN_PADDING } from "./constants";

export function ProductRelatedRail({
  title,
  items,
  isFavorite,
  onPressProduct,
  onFavorite,
}: {
  title: string;
  items: MobileProductListItem[];
  isFavorite: (id: string) => boolean;
  onPressProduct: (id: string) => void;
  onFavorite: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <HomeProductCard
            key={item.id}
            product={item}
            isFavorite={isFavorite(item.id)}
            onPress={() => onPressProduct(item.id)}
            onFavorite={() => onFavorite(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.black,
    fontSize: 17,
    paddingHorizontal: PRODUCT_SCREEN_PADDING,
  },
  row: {
    paddingHorizontal: PRODUCT_SCREEN_PADDING,
    gap: HOME_CARD_GAP,
    paddingBottom: spacing.sm,
  },
});
