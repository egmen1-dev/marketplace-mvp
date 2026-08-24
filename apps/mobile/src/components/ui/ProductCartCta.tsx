import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "../../theme/tokens";

export function ProductCartCta({
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  disabled,
}: {
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}) {
  if (quantity <= 0) {
    return (
      <Pressable
        style={[styles.addBtn, disabled ? styles.disabled : null]}
        onPress={onAdd}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="В корзину"
      >
        <MaterialCommunityIcons name="cart-outline" size={16} color={colors.orange} />
        <Text style={styles.addText}>В корзину</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.stepper}>
      <Pressable
        style={styles.stepBtn}
        onPress={onDecrement}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Уменьшить количество"
        hitSlop={6}
      >
        <Text style={styles.stepSymbol}>−</Text>
      </Pressable>
      <Text style={styles.qty} accessibilityLabel={`Количество ${quantity}`}>
        {quantity}
      </Text>
      <Pressable
        style={styles.stepBtn}
        onPress={onIncrement}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Увеличить количество"
        hitSlop={6}
      >
        <Text style={styles.stepSymbol}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: layout.buttonHeightSm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.orangeSoft,
    backgroundColor: colors.orangeSoft,
  },
  addText: { ...typography.buttonSm, color: colors.orange },
  disabled: { opacity: 0.5 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: layout.buttonHeightSm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
    overflow: "hidden",
  },
  stepBtn: {
    width: 40,
    minHeight: layout.buttonHeightSm,
    alignItems: "center",
    justifyContent: "center",
  },
  stepSymbol: { ...typography.button, color: colors.orange, fontSize: 18, lineHeight: 22 },
  qty: { ...typography.buttonSm, color: colors.black, minWidth: 28, textAlign: "center" },
});
