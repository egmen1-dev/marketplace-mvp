import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CommerceSectionHeader } from "./CommerceSectionHeader";
import { border, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { ProductCharacteristic } from "../../features/product-detail/types";

type Props = {
  rows: ProductCharacteristic[];
};

export const PdpSpecsTable = memo(function PdpSpecsTable({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <CommerceSectionHeader title="Характеристики" />
      <View style={styles.table} accessibilityRole="summary">
        {rows.map((row, idx) => (
          <View key={`${row.name}-${idx}`} style={[styles.row, idx === rows.length - 1 ? styles.rowLast : null]}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.value}>{row.displayValue}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  table: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: border.default,
    gap: spacing.md,
    minHeight: 44,
    alignItems: "center",
  },
  rowLast: { borderBottomWidth: 0 },
  name: { ...typography.caption, color: text.muted, flex: 1 },
  value: { ...typography.bodySmall, color: text.primary, flex: 1, textAlign: "right" },
});
