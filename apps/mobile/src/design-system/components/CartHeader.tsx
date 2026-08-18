import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { brand, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  itemCount: number;
  onContinueShopping: () => void;
};

export const CartHeader = memo(function CartHeader({ itemCount, onContinueShopping }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          Корзина
        </Text>
        {itemCount > 0 ? (
          <View style={styles.countBadge} accessibilityLabel={`${itemCount} товаров`}>
            <Text style={styles.countText}>{itemCount}</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        style={styles.continueBtn}
        onPress={onContinueShopping}
        accessibilityRole="button"
        accessibilityLabel="Продолжить покупки"
      >
        <MaterialCommunityIcons name="arrow-left" size={18} color={brand.primary} />
        <Text style={styles.continueText}>Продолжить покупки</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h1, color: text.primary },
  countBadge: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  countText: { ...typography.caption, color: brand.primary, fontWeight: "700" },
  continueBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 44, alignSelf: "flex-start" },
  continueText: { ...typography.bodySmall, color: brand.primary, fontWeight: "600" },
});
