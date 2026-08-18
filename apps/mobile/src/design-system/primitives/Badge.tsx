import { StyleSheet, Text, View } from "react-native";

import { colors } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export function Badge({
  label,
  tone = "neutral",
  style,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand";
  style?: object;
}) {
  const palette = {
    neutral: { bg: colors.gray100, text: colors.gray700 },
    success: { bg: colors.successSoft, text: colors.success },
    warning: { bg: colors.orangeSoft, text: colors.orange },
    danger: { bg: colors.dangerSoft, text: colors.danger },
    brand: { bg: colors.orange, text: colors.white },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function Avatar({ label, size = 40 }: { label: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{label.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  badgeText: { ...typography.caption, fontWeight: "600" },
  avatar: { backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontWeight: "700" },
});
