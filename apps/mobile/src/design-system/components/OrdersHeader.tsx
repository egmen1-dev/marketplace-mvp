import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { brand, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  activeCount: number;
  completedCount: number;
  fromCache?: boolean;
};

export const OrdersHeader = memo(function OrdersHeader({ activeCount, completedCount, fromCache }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        Мои заказы
      </Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>активных</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>завершённых</Text>
        </View>
      </View>
      {fromCache ? <Text style={styles.cacheHint}>Показаны сохранённые заказы без сети</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  title: { ...typography.h1, color: text.primary },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: brand.primarySoft,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stat: { alignItems: "center", minWidth: 72 },
  statValue: { ...typography.h2, color: brand.primary, fontWeight: "800" },
  statLabel: { ...typography.caption, color: text.secondary },
  divider: { width: 1, height: 32, backgroundColor: "rgba(255,107,0,0.25)" },
  cacheHint: { ...typography.caption, color: text.muted },
});
