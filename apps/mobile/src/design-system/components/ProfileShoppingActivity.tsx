import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProfileShoppingStats } from "../../features/profile/types";
import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  stats: ProfileShoppingStats;
};

export const ProfileShoppingActivity = memo(function ProfileShoppingActivity({ stats }: Props) {
  const items = [
    stats.ordersCount !== null ? { label: "Заказы", value: stats.ordersCount } : null,
    stats.favoritesCount !== null ? { label: "Избранное", value: stats.favoritesCount } : null,
    stats.recentViewsCount !== null ? { label: "Просмотры", value: stats.recentViewsCount } : null,
  ].filter(Boolean) as Array<{ label: string; value: number }>;

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Активность покупок</Text>
      <View style={styles.row}>
        {items.map((item) => (
          <View key={item.label} style={styles.stat}>
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: text.muted, textTransform: "uppercase", fontWeight: "700" },
  row: {
    flexDirection: "row",
    backgroundColor: brand.primarySoft,
    borderRadius: radii.xl,
    padding: spacing.lg,
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", gap: spacing.xs, minWidth: 72 },
  value: { ...typography.h2, color: brand.primary, fontWeight: "800" },
  label: { ...typography.caption, color: text.secondary },
});
