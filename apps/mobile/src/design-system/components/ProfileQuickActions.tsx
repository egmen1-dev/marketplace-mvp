import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { QuickAction } from "../../features/profile/types";
import { usePressScale } from "../../hooks/usePressScale";
import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  actions: QuickAction[];
};

function QuickActionTile({ action }: { action: QuickAction }) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);

  return (
    <Pressable
      style={[styles.tile, { transform: [{ scale }] }]}
      onPress={() => router.push(action.route as never)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={action.label}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={action.icon as never} size={24} color={brand.primary} />
        {action.badge && action.badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{action.badge > 99 ? "99+" : action.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.label}>{action.label}</Text>
    </Pressable>
  );
}

export const ProfileQuickActions = memo(function ProfileQuickActions({ actions }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Быстрые действия</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <QuickActionTile key={action.id} action={action} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: text.muted, textTransform: "uppercase", fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    width: "31%",
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 96,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...shadows.card,
  },
  iconWrap: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { ...typography.caption, color: "#fff", fontSize: 10, fontWeight: "700" },
  label: { ...typography.caption, color: text.primary, textAlign: "center", fontWeight: "600" },
});
