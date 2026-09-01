import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { MobileProductListItem } from "../../api/endpoints";
import { ProductCard } from "../../commerce/product-card";
import { HOME_CARD_GAP } from "../../home/constants";
import { colors, spacing, typography } from "../../theme/tokens";
import { PRODUCT_SCREEN_PADDING } from "./constants";

export function ProductRelatedRail({
  title,
  items,
  isFavorite,
  isFavoriteBusy,
  isCartBusy,
  onPressProduct,
  onFavorite,
  onAddToCart,
  onIncrementCart,
  onDecrementCart,
}: {
  title: string;
  items: MobileProductListItem[];
  isFavorite: (id: string) => boolean;
  isFavoriteBusy?: (id: string) => boolean;
  isCartBusy?: (id: string) => boolean;
  onPressProduct: (id: string) => void;
  onFavorite: (id: string) => void;
  onAddToCart: (id: string) => void;
  onIncrementCart: (id: string) => void;
  onDecrementCart: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item, index) => (
          <View key={item.id} style={index > 0 ? { marginLeft: HOME_CARD_GAP } : undefined}>
            <ProductCard
              variant="rail"
              product={item}
              isFavorite={isFavorite(item.id)}
              isFavoriteBusy={isFavoriteBusy?.(item.id)}
              isCartBusy={isCartBusy?.(item.id)}
              onPress={() => onPressProduct(item.id)}
              onFavorite={() => onFavorite(item.id)}
              onAddToCart={() => onAddToCart(item.id)}
              onIncrementCart={() => onIncrementCart(item.id)}
              onDecrementCart={() => onDecrementCart(item.id)}
            />
          </View>
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
    paddingBottom: spacing.sm,
  },
});
