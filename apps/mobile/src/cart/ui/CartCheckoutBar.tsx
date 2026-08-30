import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatPrice } from "../../utils/format";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { CART_CHECKOUT_BAR_HEIGHT, CART_SCREEN_PADDING } from "./constants";
import { formatCheckoutCount } from "./format";

export function CartCheckoutBar({
  itemCount,
  subtotal,
  totalSaving,
  loading,
  disabled,
  onCheckout,
}: {
  itemCount: number;
  subtotal: number;
  totalSaving?: number;
  loading?: boolean;
  disabled?: boolean;
  onCheckout: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Итого</Text>
          <Text style={styles.summaryTotal}>{formatPrice(subtotal)}</Text>
        </View>
        {totalSaving != null && totalSaving > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.savingLabel}>Вы экономите</Text>
            <Text style={styles.savingValue}>{formatPrice(totalSaving)}</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        style={[styles.btn, disabled || loading ? styles.btnDisabled : null]}
        onPress={onCheckout}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel="Перейти к оформлению"
      >
        <Text style={styles.title}>{loading ? "Создание заказа…" : "Перейти к оформлению"}</Text>
        {itemCount > 0 ? <Text style={styles.subtitle}>{formatCheckoutCount(itemCount)}</Text> : null}
      </Pressable>
    </View>
  );
}

export function cartCheckoutBarInset(bottomInset: number, hasSaving?: boolean): number {
  const summaryHeight = hasSaving ? 72 : 44;
  return summaryHeight + CART_CHECKOUT_BAR_HEIGHT + Math.max(bottomInset, spacing.md) + spacing.lg + spacing.md;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: CART_SCREEN_PADDING,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  summary: {
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  summaryLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.black,
  },
  summaryTotal: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.black,
  },
  savingLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8A8A8A",
  },
  savingValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.success,
  },
  btn: {
    minHeight: CART_CHECKOUT_BAR_HEIGHT,
    borderRadius: radii.lg,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: 2,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  title: {
    ...typography.button,
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.white,
    opacity: 0.92,
  },
});
