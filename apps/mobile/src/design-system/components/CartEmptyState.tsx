import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryCTA } from "./PrimaryCTA";
import { brand, surface, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  onBrowseCatalog: () => void;
};

export const CartEmptyState = memo(function CartEmptyState({ onBrowseCatalog }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <View style={styles.illustration}>
        <MaterialCommunityIcons name="cart-off" size={72} color={brand.primaryMuted} />
      </View>
      <Text style={styles.title}>Корзина пуста</Text>
      <Text style={styles.body}>Добавьте товары из каталога — они появятся здесь, и вы сможете оформить заказ в пару шагов.</Text>
      <PrimaryCTA label="Перейти в каталог" fullWidth onPress={onBrowseCatalog} accessibilityLabel="Перейти в каталог" />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["3xl"],
    gap: spacing.lg,
    backgroundColor: surface.background,
  },
  illustration: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.h1, color: text.primary, textAlign: "center" },
  body: { ...typography.body, color: text.secondary, textAlign: "center", lineHeight: 22 },
});
