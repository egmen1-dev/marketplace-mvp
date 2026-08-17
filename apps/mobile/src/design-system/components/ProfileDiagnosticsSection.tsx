import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { brand, border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  versionName: string;
  commit: string;
  environment: string;
  buildDateLabel: string;
  onBuildInfo: () => void;
  onDiagnostics: () => void;
  onCrashReport: () => void;
};

export const ProfileDiagnosticsSection = memo(function ProfileDiagnosticsSection({
  versionName,
  commit,
  environment,
  buildDateLabel,
  onBuildInfo,
  onDiagnostics,
  onCrashReport,
}: Props) {
  const rows = [
    { label: "Build Info", subtitle: `${versionName} · ${commit}`, icon: "information-outline", onPress: onBuildInfo },
    { label: "Startup Diagnostics", subtitle: "Этапы запуска и ошибки", icon: "speedometer", onPress: onDiagnostics },
    { label: "Crash Report", subtitle: "Отправить отчёт об ошибке", icon: "alert-circle-outline", onPress: onCrashReport },
  ] as const;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Диагностика</Text>
      <View style={styles.meta}>
        <Text style={styles.metaLine}>Версия {versionName}</Text>
        <Text style={styles.metaLine}>Commit {commit}</Text>
        <Text style={styles.metaLine}>Среда {environment}</Text>
        <Text style={styles.metaLine}>Сборка {buildDateLabel}</Text>
      </View>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Pressable
            key={row.label}
            style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
            onPress={row.onPress}
            accessibilityRole="button"
          >
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={row.icon} size={22} color={brand.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>{row.label}</Text>
              <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={text.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: text.muted, textTransform: "uppercase", fontWeight: "700" },
  meta: { gap: 2, paddingHorizontal: spacing.xs },
  metaLine: { ...typography.caption, color: text.muted },
  card: { backgroundColor: surface.card, borderRadius: radii.xl, overflow: "hidden", borderWidth: 1, borderColor: border.default },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: border.default },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: text.primary, fontWeight: "700" },
  rowSubtitle: { ...typography.caption, color: text.muted },
});
