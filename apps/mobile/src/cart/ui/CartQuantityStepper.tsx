import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, typography } from "../../theme/tokens";

export function CartQuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  disabled,
  max,
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  max?: number;
}) {
  const atMax = max != null && quantity >= max;

  return (
    <View style={[styles.stepper, disabled ? styles.disabled : null]}>
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
        disabled={disabled || atMax}
        accessibilityRole="button"
        accessibilityLabel="Увеличить количество"
        hitSlop={6}
      >
        <Text style={[styles.stepSymbol, atMax ? styles.stepDisabled : null]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    backgroundColor: colors.white,
    overflow: "hidden",
    minWidth: 108,
    height: 36,
  },
  disabled: {
    opacity: 0.5,
  },
  stepBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  stepSymbol: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    color: colors.black,
  },
  stepDisabled: {
    color: colors.gray300,
  },
  qty: {
    ...typography.buttonSm,
    color: colors.black,
    minWidth: 28,
    textAlign: "center",
    fontWeight: "700",
  },
});
