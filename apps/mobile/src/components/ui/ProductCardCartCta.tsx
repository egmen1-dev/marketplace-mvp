import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "../../theme/tokens";
import { PRODUCT_CARD_LAYOUT } from "./product-card-layout";

export type ProductCardCartCtaProps = {
  quantity: number;
  busy?: boolean;
  disabled?: boolean;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function ProductCardCartCta({
  quantity,
  busy = false,
  disabled = false,
  onAdd,
  onIncrement,
  onDecrement,
}: ProductCardCartCtaProps) {
  const slotHeight = PRODUCT_CARD_LAYOUT.ctaMinHeight + spacing.xs;

  if (quantity <= 0) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.addBtn,
          pressed && !disabled && !busy ? styles.addBtnPressed : null,
          (disabled || busy) && styles.addBtnDisabled,
        ]}
        onPress={(e) => {
          e.stopPropagation?.();
          if (!disabled && !busy) onAdd();
        }}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityLabel="В корзину"
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <MaterialCommunityIcons name="cart" size={16} color={colors.white} />
            <Text style={styles.addText}>В корзину</Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.stepper}>
      <Pressable
        style={({ pressed }) => [styles.stepBtn, pressed && !disabled && !busy ? styles.stepBtnPressed : null]}
        onPress={(e) => {
          e.stopPropagation?.();
          if (!disabled && !busy) onDecrement();
        }}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityLabel="Уменьшить количество"
        hitSlop={4}
      >
        <Text style={styles.stepSymbol}>−</Text>
      </Pressable>
      <View style={styles.qtyCenter}>
        {busy ? <ActivityIndicator size="small" color={colors.orange} /> : <Text style={styles.qtyText}>{quantity}</Text>}
      </View>
      <Pressable
        style={({ pressed }) => [styles.stepBtn, pressed && !disabled && !busy ? styles.stepBtnPressed : null]}
        onPress={(e) => {
          e.stopPropagation?.();
          if (!disabled && !busy) onIncrement();
        }}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityLabel="Увеличить количество"
        hitSlop={4}
      >
        <Text style={styles.stepSymbol}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: PRODUCT_CARD_LAYOUT.ctaMinHeight,
    borderRadius: radii.md,
    backgroundColor: colors.ctaPrimary,
  },
  addBtnPressed: {
    backgroundColor: colors.ctaPrimaryPressed,
  },
  addBtnDisabled: {
    backgroundColor: colors.ctaPrimaryDisabled,
    opacity: 0.72,
  },
  addText: { ...typography.buttonSm, color: colors.white },
  stepper: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    minHeight: PRODUCT_CARD_LAYOUT.ctaMinHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.orangeSoft,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  stepBtn: {
    minWidth: layout.buttonHeightSm,
    minHeight: PRODUCT_CARD_LAYOUT.ctaMinHeight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ctaPrimary,
  },
  stepBtnPressed: {
    backgroundColor: colors.ctaPrimaryPressed,
  },
  stepSymbol: {
    ...typography.buttonSm,
    color: colors.white,
    fontSize: 18,
    lineHeight: 20,
  },
  qtyCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: PRODUCT_CARD_LAYOUT.ctaMinHeight,
  },
  qtyText: {
    ...typography.buttonSm,
    color: colors.black,
    fontVariant: ["tabular-nums"],
  },
});
