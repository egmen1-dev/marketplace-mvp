import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatPrice } from "../../utils/format";
import { brand, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  itemCount: number;
  subtotal: number;
  savings: number;
  currency?: string;
};

export const CartSummaryBar = memo(function CartSummaryBar({ itemCount, subtotal, savings, currency = "₽" }: Props) {
  if (itemCount <= 0) return null;

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.row}>
        <Text style={styles.label}>Товаров</Text>
        <Text style={styles.value}>{itemCount}</Text>
      </View>
      {savings > 0 ? (
        <View style={styles.row}>
          <Text style={styles.label}>Экономия</Text>
          <Text style={styles.savings}>-{formatPrice(savings, currency)}</Text>
        </View>
      ) : null}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>Итого</Text>
        <Text style={styles.totalValue}>{formatPrice(subtotal, currency)}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: brand.primarySoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { ...typography.bodySmall, color: text.secondary },
  value: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  savings: { ...typography.bodySmall, color: semantic.success, fontWeight: "700" },
  totalRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: brand.primarySoft,
  },
  totalLabel: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  totalValue: { ...typography.subtitle, color: brand.primary, fontWeight: "800" },
});
