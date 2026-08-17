import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { brand, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  versionName: string;
  versionCode: number;
  buildDateLabel: string;
  synced: boolean;
};

export const ProfileAccountCard = memo(function ProfileAccountCard({ versionName, versionCode, buildDateLabel, synced }: Props) {
  const rows = [
    { icon: "check-circle-outline", label: "Аккаунт активен", ok: true },
    { icon: "cellphone-information", label: `Версия ${versionName} (${versionCode})`, ok: true },
    { icon: synced ? "cloud-check-outline" : "cloud-off-outline", label: synced ? "Синхронизация выполнена" : "Офлайн-режим", ok: synced },
    { icon: "update", label: `Сборка ${buildDateLabel}`, ok: true },
  ] as const;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Карточка аккаунта</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <MaterialCommunityIcons name={row.icon} size={20} color={row.ok ? semantic.success : text.muted} />
          <Text style={styles.rowText}>{row.label}</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...shadows.card,
  },
  title: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 32 },
  rowText: { ...typography.body, color: text.primary, flex: 1 },
});
