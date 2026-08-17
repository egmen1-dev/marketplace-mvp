import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { OrderTimelineStep } from "../../features/orders/types";
import { brand, border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  steps: OrderTimelineStep[];
};

export const OrderTimeline = memo(function OrderTimeline({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <View style={styles.wrap} accessibilityRole="list">
      <Text style={styles.title}>История заказа</Text>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <View key={step.id} style={styles.row} accessibilityRole="text">
            <View style={styles.rail}>
              <View style={[styles.dot, step.isCurrent ? styles.dotActive : null]}>
                {step.isCurrent ? (
                  <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                ) : (
                  <View style={styles.dotInner} />
                )}
              </View>
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.content}>
              <Text style={[styles.label, step.isCurrent ? styles.labelActive : null]}>{step.label}</Text>
              <Text style={styles.time}>{step.timestampLabel}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: border.default,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  row: { flexDirection: "row", gap: spacing.md, minHeight: 56 },
  rail: { width: 28, alignItems: "center" },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: border.strong,
    backgroundColor: surface.background,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { borderColor: brand.primary, backgroundColor: brand.primary },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: border.strong },
  line: { flex: 1, width: 2, backgroundColor: border.default, marginVertical: spacing.xs },
  content: { flex: 1, gap: 2, paddingBottom: spacing.sm },
  label: { ...typography.bodySmall, color: text.secondary, fontWeight: "600" },
  labelActive: { color: text.primary, fontWeight: "700" },
  time: { ...typography.caption, color: text.muted },
});
