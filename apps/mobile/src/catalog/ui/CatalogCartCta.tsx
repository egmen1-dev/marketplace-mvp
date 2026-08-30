import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, typography } from "../../theme/tokens";

export function CatalogCartCta({
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
        style={({ pressed }) => [styles.addBtn, disabled ? styles.disabled : pressed ? styles.addBtnPressed : null]}
        onPress={onAdd}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="В корзину"
      >
        <MaterialCommunityIcons name="cart-outline" size={16} color={colors.ctaPrimary} />
        <Text style={styles.addText}>В корзину</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={onDecrement} disabled={disabled} accessibilityRole="button" hitSlop={6}>
        <Text style={styles.stepSymbol}>−</Text>
      </Pressable>
      <Text style={styles.qty}>{quantity}</Text>
      <Pressable style={styles.stepBtn} onPress={onIncrement} disabled={disabled} accessibilityRole="button" hitSlop={6}>
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
    gap: 6,
    minHeight: layout.buttonHeightSm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    backgroundColor: colors.white,
  },
  addBtnPressed: {
    backgroundColor: "#FAFAFA",
  },
  addText: {
    ...typography.buttonSm,
    color: colors.ctaPrimary,
    fontWeight: "700",
  },
  disabled: { opacity: 0.5 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: layout.buttonHeightSm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.ctaPrimary,
    backgroundColor: colors.orangeSoft,
    overflow: "hidden",
  },
  stepBtn: {
    width: 36,
    minHeight: layout.buttonHeightSm,
    alignItems: "center",
    justifyContent: "center",
  },
  stepSymbol: { ...typography.button, color: colors.ctaPrimary, fontSize: 18, lineHeight: 22 },
  qty: { ...typography.buttonSm, color: colors.black, minWidth: 24, textAlign: "center" },
});
