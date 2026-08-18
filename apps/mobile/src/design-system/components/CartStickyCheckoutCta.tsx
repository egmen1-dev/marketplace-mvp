import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryCTA } from "./PrimaryCTA";
import { formatPrice } from "../../utils/format";
import { border, surface, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  bottomInset: number;
  subtotal: number;
  itemCount: number;
  currency?: string;
  disabled?: boolean;
  onCheckout: () => void;
};

export const CartStickyCheckoutCta = memo(function CartStickyCheckoutCta({
  bottomInset,
  subtotal,
  itemCount,
  currency = "₽",
  disabled,
  onCheckout,
}: Props) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, spacing.md) }]} accessibilityRole="toolbar">
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>{itemCount} товаров</Text>
        <Text style={styles.summaryValue}>{formatPrice(subtotal, currency)}</Text>
      </View>
      <View style={styles.ctaWrap}>
        <PrimaryCTA
          label="Оформить заказ"
          fullWidth
          disabled={disabled}
          onPress={onCheckout}
          accessibilityLabel="Оформить заказ"
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: surface.background,
    borderTopWidth: 1,
    borderTopColor: border.default,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  summary: { gap: 2 },
  summaryLabel: { ...typography.caption, color: text.muted },
  summaryValue: { ...typography.subtitle, color: text.primary, fontWeight: "800" },
  ctaWrap: { flex: 1, minHeight: layout.buttonHeightLg },
});
