import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";

export function Chip({
  label,
  active,
  onPress,
  icon,
  style,
  variant = "default",
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Category chips use two-line readable labels in the horizontal rail. */
  variant?: "default" | "category";
}) {
  const isCategory = variant === "category";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      style={[
        styles.chip,
        isCategory ? styles.chipCategory : null,
        active ? styles.chipActive : styles.chipInactive,
        style,
      ]}
    >
      {icon}
      <Text
        style={[styles.label, isCategory ? styles.labelCategory : null, active ? styles.labelActive : null]}
        numberOfLines={isCategory ? 2 : 1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    minHeight: 38,
    maxHeight: 42,
    justifyContent: "center",
    alignSelf: "flex-start",
    maxWidth: 160,
  },
  chipCategory: {
    minWidth: 92,
    maxWidth: 132,
    minHeight: 44,
    maxHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  chipInactive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  chipActive: {
    backgroundColor: colors.orange,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  label: {
    ...typography.caption,
    color: colors.gray900,
    fontWeight: "600",
    flexShrink: 1,
  },
  labelCategory: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  labelActive: {
    color: colors.white,
  },
});
