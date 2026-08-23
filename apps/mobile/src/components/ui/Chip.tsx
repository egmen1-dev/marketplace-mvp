import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";

export function Chip({
  label,
  active,
  onPress,
  icon,
  style,
  maxWidth = 160,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive, { maxWidth }, style]}
    >
      {icon}
      <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1} ellipsizeMode="tail">
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
  labelActive: {
    color: colors.white,
  },
});
