import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileProductListItem } from "../api/endpoints";
import { colors, typography } from "../theme/tokens";
import { HOME_CARD_GAP, HOME_SCREEN_PADDING } from "./constants";
import { HomeProductCard } from "./HomeProductCard";

type HomeProductRailProps = {
  title: string;
  items: MobileProductListItem[];
  onMore?: () => void;
  isFavorite: (id: string) => boolean;
  onFavorite: (id: string) => void;
  onPressProduct: (id: string) => void;
};

export function HomeProductRail({
  title,
  items,
  onMore,
  isFavorite,
  onFavorite,
  onPressProduct,
}: HomeProductRailProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onMore ? (
          <Pressable onPress={onMore} accessibilityRole="button">
            <Text style={styles.action}>Смотреть все</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: HOME_CARD_GAP }} />}
        renderItem={({ item }) => (
          <HomeProductCard
            product={item}
            isFavorite={isFavorite(item.id)}
            onFavorite={() => onFavorite(item.id)}
            onPress={() => onPressProduct(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HOME_SCREEN_PADDING,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: colors.black,
  },
  action: {
    ...typography.caption,
    fontSize: 14,
    color: colors.ctaPrimary,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: HOME_SCREEN_PADDING,
    paddingRight: HOME_SCREEN_PADDING,
  },
});
