import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { brand, border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Row = {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
};

type Props = {
  onSupport: () => void;
  onFaq: () => void;
  onReport: () => void;
  onPolicy: () => void;
  onTerms: () => void;
};

export const ProfileSupportSection = memo(function ProfileSupportSection({
  onSupport,
  onFaq,
  onReport,
  onPolicy,
  onTerms,
}: Props) {
  const rows: Row[] = [
    { id: "support", label: "Поддержка", icon: "lifebuoy", onPress: onSupport },
    { id: "faq", label: "FAQ", icon: "frequently-asked-questions", onPress: onFaq },
    { id: "report", label: "Сообщить об ошибке", icon: "bug-outline", onPress: onReport },
    { id: "policy", label: "Политика конфиденциальности", icon: "shield-account-outline", onPress: onPolicy },
    { id: "terms", label: "Пользовательское соглашение", icon: "file-document-outline", onPress: onTerms },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Поддержка</Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Pressable
            key={row.id}
            style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
            onPress={row.onPress}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name={row.icon as never} size={22} color={text.secondary} />
            <Text style={styles.rowText}>{row.label}</Text>
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
  card: { backgroundColor: surface.card, borderRadius: radii.xl, overflow: "hidden", borderWidth: 1, borderColor: border.default },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: border.default },
  rowText: { ...typography.body, color: text.primary, flex: 1 },
});
