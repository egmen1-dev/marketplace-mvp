import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileUpdateInfo } from "../../api/endpoints";
import { PrimaryCTA } from "./PrimaryCTA";
import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  versionName: string;
  buildDateLabel: string;
  updateInfo: MobileUpdateInfo | null;
  hasUpdate: boolean;
  onUpdate: () => void;
};

export const ProfileClosedAlphaCard = memo(function ProfileClosedAlphaCard({
  versionName,
  buildDateLabel,
  updateInfo,
  hasUpdate,
  onUpdate,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Closed Alpha</Text>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="alpha-a-box" size={28} color={brand.primary} />
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Closed Alpha</Text>
            <Text style={styles.subtitle}>Канал раннего доступа ЛОТ</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaLine}>Версия приложения · {versionName}</Text>
          <Text style={styles.metaLine}>Последнее обновление · {buildDateLabel}</Text>
          <Text style={styles.metaLine}>Канал · Closed Alpha</Text>
        </View>
        {hasUpdate && updateInfo ? (
          <View style={styles.updateBox}>
            <Text style={styles.updateTitle}>
              {updateInfo.updateState === "REQUIRED_UPDATE" ? "Требуется обновление" : `Доступна ${updateInfo.versionName}`}
            </Text>
            {updateInfo.releaseNotes?.[0] ? <Text style={styles.updateNotes}>{updateInfo.releaseNotes[0]}</Text> : null}
            <PrimaryCTA label="Обновить приложение" onPress={onUpdate} fullWidth />
          </View>
        ) : (
          <View style={styles.upToDate}>
            <MaterialCommunityIcons name="check-decagram" size={18} color={brand.primary} />
            <Text style={styles.upToDateText}>У вас актуальная версия Closed Alpha</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: text.muted, textTransform: "uppercase", fontWeight: "700" },
  card: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: brand.primarySoft,
    ...shadows.card,
  },
  headerRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  headerCopy: { flex: 1, gap: 2 },
  title: { ...typography.h3, color: text.primary },
  subtitle: { ...typography.body, color: text.secondary },
  meta: { gap: spacing.xs },
  metaLine: { ...typography.caption, color: text.muted },
  updateBox: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, backgroundColor: brand.primarySoft },
  updateTitle: { ...typography.subtitle, color: brand.primary, fontWeight: "700" },
  updateNotes: { ...typography.caption, color: text.secondary },
  upToDate: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  upToDateText: { ...typography.bodySmall, color: text.secondary },
});
