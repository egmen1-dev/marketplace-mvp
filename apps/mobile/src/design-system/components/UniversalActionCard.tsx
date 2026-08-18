import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand, border, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface UniversalActionCardProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  priority?: "critical" | "high" | "medium" | "low";
  onPress: () => void;
  disabled?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: semantic.danger,
  high: semantic.warning,
  medium: brand.primary,
  low: text.muted,
};

export function UniversalActionCard({
  title,
  subtitle,
  actionLabel,
  priority = "medium",
  onPress,
  disabled = false,
}: UniversalActionCardProps) {
  const accent = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: surface.card,
          borderColor: border.default,
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${actionLabel}`}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
        <View style={styles.actionPill}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: text.muted,
    marginBottom: spacing.sm,
  },
  actionPill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: brand.primarySoft,
  },
  actionText: {
    ...typography.caption,
    fontWeight: "600",
    color: brand.primary,
  },
});
