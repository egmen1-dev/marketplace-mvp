import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TabBarBadge } from "../../components/ui/TabBarBadge";
import { brand, surface, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export function BuyerHomeHeader({
  cartCount,
  onCartPress,
  deliveryHint = "Быстрая доставка по всей России",
}: {
  cartCount: number;
  onCartPress: () => void;
  deliveryHint?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>ЛОТ</Text>
        <Text style={styles.delivery} numberOfLines={1}>
          {deliveryHint}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cartCount > 0 ? `Корзина, ${cartCount} товаров` : "Корзина"}
        onPress={onCartPress}
        style={styles.cartBtn}
        hitSlop={8}
      >
        <TabBarBadge count={cartCount}>
          <View style={styles.cartIconWrap}>
            <MaterialCommunityIcons name="cart-outline" size={22} color={text.primary} />
          </View>
        </TabBarBadge>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  brandBlock: { flex: 1, gap: 2 },
  brand: { ...typography.h1, color: brand.primary, letterSpacing: 0.5 },
  delivery: { ...typography.caption, color: text.muted },
  cartBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  cartIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: surface.backgroundMuted,
    alignItems: "center",
    justifyContent: "center",
  },
});
