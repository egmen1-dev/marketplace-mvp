import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { surface, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  onDiagnostics: () => void;
};

type Row = { label: string; value?: string; disabled?: boolean; onPress?: () => void };

export const ProfileSettingsSection = memo(function ProfileSettingsSection({ onDiagnostics }: Props) {
  const rows: Row[] = [
    { label: "Уведомления", value: "Скоро", disabled: true },
    { label: "Тема", value: "Светлая", disabled: true },
    { label: "Язык", value: "Русский", disabled: true },
    { label: "Биометрия", value: "После APP-SHELL-1", disabled: true },
    { label: "Автообновление", value: "Включено", disabled: true },
    { label: "Диагностика", onPress: onDiagnostics },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Настройки</Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Pressable
            key={row.label}
            style={[styles.row, index < rows.length - 1 && styles.rowBorder, row.disabled && styles.rowDisabled]}
            onPress={row.onPress}
            disabled={row.disabled || !row.onPress}
            accessibilityRole="button"
            accessibilityState={{ disabled: row.disabled }}
          >
            <Text style={[styles.rowText, row.disabled && styles.rowTextMuted]}>{row.label}</Text>
            {row.value ? <Text style={styles.value}>{row.value}</Text> : null}
            {row.onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={text.muted} /> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: text.muted, textTransform: "uppercase", fontWeight: "700" },
  card: { backgroundColor: surface.card, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" },
  rowDisabled: { opacity: 0.65 },
  rowText: { ...typography.body, color: text.primary, flex: 1 },
  rowTextMuted: { color: text.muted },
  value: { ...typography.caption, color: text.muted },
});
