import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { CART_SCREEN_PADDING } from "./constants";

export function CartEmptyState({ onCatalog }: { onCatalog: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="cart-outline" size={40} color={colors.ctaPrimary} />
      </View>
      <Text style={styles.title}>Корзина пока пуста</Text>
      <Text style={styles.subtitle}>Добавьте товары, которые хотите купить</Text>
      <Pressable style={styles.cta} onPress={onCatalog} accessibilityRole="button">
        <Text style={styles.ctaText}>Перейти в каталог</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: CART_SCREEN_PADDING,
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.black,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#8A8A8A",
    textAlign: "center",
    maxWidth: 280,
  },
  cta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.ctaPrimary,
    minWidth: 220,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.white,
  },
});
