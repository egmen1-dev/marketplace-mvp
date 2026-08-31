import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "../../theme/tokens";
import { formatPrice } from "../../utils/format";
import { CHECKOUT_SCREEN_PADDING, CHECKOUT_SUBMIT_BAR_HEIGHT } from "./constants";

/** EPIC 154 gate + commerce semantics while browser handoff starts. */
export const CHECKOUT_SUBMIT_LOADING_LABEL = "Создание заказа…";

export function CheckoutSubmitBar({
  subtotal,
  loading,
  disabled,
  inactive,
  onSubmit,
}: {
  subtotal: number;
  loading?: boolean;
  disabled?: boolean;
  inactive?: boolean;
  onSubmit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isDisabled = Boolean(disabled || inactive || loading);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <Pressable
        style={[styles.btn, isDisabled ? styles.btnDisabled : null]}
        onPress={onSubmit}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel="Перейти к оформлению"
      >
        <Text style={styles.title}>{loading ? CHECKOUT_SUBMIT_LOADING_LABEL : "Перейти к оформлению"}</Text>
        <Text style={styles.subtitle}>К оплате: {formatPrice(subtotal)}</Text>
      </Pressable>
    </View>
  );
}

export function checkoutSubmitBarInset(bottomInset: number): number {
  return CHECKOUT_SUBMIT_BAR_HEIGHT + Math.max(bottomInset, spacing.md) + spacing.lg + spacing.md;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: CHECKOUT_SCREEN_PADDING,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  btn: {
    minHeight: CHECKOUT_SUBMIT_BAR_HEIGHT,
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
