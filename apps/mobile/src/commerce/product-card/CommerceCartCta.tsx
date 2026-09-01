import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, typography } from "../../theme/tokens";

export function CommerceCartCta({
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  busy,
  outOfStock,
  compact,
}: {
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  busy?: boolean;
  outOfStock?: boolean;
  compact?: boolean;
}) {
  const disabled = busy || outOfStock;
  const minHeight = compact ? 36 : layout.buttonHeightSm;

  if (outOfStock) {
    return (
      <View style={[styles.outOfStock, { minHeight }]}>
        <Text style={styles.outOfStockText}>Нет в наличии</Text>
      </View>
    );
  }

  if (quantity <= 0) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.addBtn,
          compact ? styles.addBtnCompact : null,
          { minHeight },
          disabled ? styles.disabled : pressed ? styles.addBtnPressed : null,
        ]}
        onPress={(event) => {
          event.stopPropagation();
          onAdd();
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="В корзину"
        accessibilityState={{ disabled }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.ctaPrimary} />
        ) : (
          <>
            <MaterialCommunityIcons name="cart-outline" size={16} color={colors.ctaPrimary} />
            <Text style={styles.addText}>В корзину</Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <View style={[styles.stepper, { minHeight }]}>
      <Pressable
        style={styles.stepBtn}
        onPress={(event) => {
          event.stopPropagation();
          onDecrement();
        }}
        disabled={disabled}
        accessibilityRole="button"
        hitSlop={6}
      >
        <Text style={styles.stepSymbol}>−</Text>
      </Pressable>
      {busy ? (
        <ActivityIndicator size="small" color={colors.ctaPrimary} />
      ) : (
        <Text style={styles.qty}>{quantity}</Text>
      )}
      <Pressable
        style={styles.stepBtn}
        onPress={(event) => {
          event.stopPropagation();
          onIncrement();
        }}
        disabled={disabled}
        accessibilityRole="button"
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
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#E9E9EC",
    backgroundColor: colors.white,
  },
  addBtnCompact: {
    paddingHorizontal: 4,
  },
  addBtnPressed: {
    backgroundColor: "#FAFAFA",
  },
  addText: {
    ...typography.buttonSm,
    color: colors.ctaPrimary,
    fontWeight: "700",
  },
  disabled: { opacity: 0.6 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  outOfStock: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#E9E9EC",
    backgroundColor: "#F7F7F8",
  },
  outOfStockText: {
    ...typography.caption,
    color: "#77777E",
    fontWeight: "600",
  },
});
