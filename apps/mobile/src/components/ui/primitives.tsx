import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, layout, radii, spacing, typography } from "../../theme/tokens";

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

export function Price({ value, compareAt, large }: { value: number; compareAt?: number | null; large?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[large ? typography.display : typography.h2, styles.priceValue]}>
        {value.toLocaleString("ru-RU")} ₽
      </Text>
      {compareAt && compareAt > value ? (
        <Text style={styles.compareAt}>{compareAt.toLocaleString("ru-RU")} ₽</Text>
      ) : null}
    </View>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingStar}>★</Text>
      <Text style={styles.ratingValue}>{value.toFixed(1)}</Text>
      {typeof count === "number" ? <Text style={styles.ratingCount}>({count})</Text> : null}
    </View>
  );
}

export function SearchBar(props: TextInputProps) {
  return (
    <View style={styles.searchWrap}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput placeholderTextColor={colors.gray500} style={styles.searchInput} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  badgeText: { ...typography.caption, fontWeight: "600" },
  avatar: { backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  priceValue: { color: colors.black, fontWeight: "700" },
  compareAt: { ...typography.caption, color: colors.gray500, textDecorationLine: "line-through" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  ratingStar: { color: colors.orange, fontSize: 14 },
  ratingValue: { ...typography.caption, fontWeight: "600", color: colors.black },
  ratingCount: { ...typography.caption, color: colors.gray500 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray100,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: layout.inputHeight,
    gap: spacing.sm,
  },
  searchIcon: { color: colors.gray500, fontSize: 18 },
  searchInput: { flex: 1, ...typography.body, color: colors.black, paddingVertical: spacing.sm },
});
