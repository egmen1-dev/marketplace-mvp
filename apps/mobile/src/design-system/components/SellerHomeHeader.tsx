import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { Badge } from "../primitives/Badge";
import { brand, border, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export type SellerHomeHeaderProps = {
  storeName: string;
  logoUrl: string | null;
  isVerified: boolean;
  dateLabel: string;
  offline: boolean;
};

export function SellerHomeHeader({ header }: { header: SellerHomeHeaderProps }) {
  const initial = header.storeName.slice(0, 1).toUpperCase();

  return (
    <View style={styles.wrap} accessibilityRole="header">
      <View style={styles.identity}>
        {header.logoUrl ? (
          <Image source={{ uri: header.logoUrl }} style={styles.avatarImage} accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.avatar} accessibilityLabel={`Аватар ${header.storeName}`}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text style={styles.storeName} numberOfLines={1} accessibilityRole="text">
              {header.storeName}
            </Text>
            {header.isVerified ? <Badge label="Проверен" tone="success" /> : null}
          </View>
          <View style={styles.subRow}>
            <Text style={styles.mode}>Режим продавца</Text>
            <View style={styles.syncRow} accessibilityLabel={header.offline ? "Оффлайн, показаны сохранённые данные" : "Онлайн, данные синхронизированы"}>
              <MaterialCommunityIcons
                name={header.offline ? "cloud-off-outline" : "cloud-check-outline"}
                size={14}
                color={header.offline ? semantic.warning : semantic.success}
              />
              <Text style={[styles.syncText, header.offline ? styles.syncOffline : styles.syncOnline]}>
                {header.offline ? "Оффлайн" : "Синхронизировано"}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={styles.date} accessibilityLabel={`Сегодня ${header.dateLabel}`}>
        {header.dateLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, paddingVertical: spacing.sm },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 52, height: 52, borderRadius: radii.pill, backgroundColor: surface.backgroundMuted },
  avatarText: { ...typography.h2, color: brand.primary },
  meta: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  storeName: { ...typography.h2, color: text.primary, flexShrink: 1 },
  subRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  mode: { ...typography.caption, color: text.muted },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingHorizontal: spacing.xs },
  syncText: { ...typography.caption },
  syncOnline: { color: semantic.success },
  syncOffline: { color: semantic.warning },
  date: { ...typography.bodySmall, color: text.secondary, textTransform: "capitalize" },
});
