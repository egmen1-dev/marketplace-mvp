import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "../../components/ui";
import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  displayName: string;
  displayEmail: string;
  mode: "buyer" | "seller";
  sellerCapable: boolean;
  fromCache?: boolean;
  onSwitchMode?: () => void;
};

export const ProfileHeader = memo(function ProfileHeader({
  displayName,
  displayEmail,
  mode,
  sellerCapable,
  fromCache,
  onSwitchMode,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Avatar label={displayName || displayEmail} size={64} />
        <View style={styles.meta}>
          <Text style={styles.name} accessibilityRole="header">
            {displayName}
          </Text>
          <Text style={styles.email}>{displayEmail}</Text>
          <View style={styles.badges}>
            <View style={styles.modeBadge}>
              <Text style={styles.modeText}>{mode === "seller" ? "Продавец" : "Покупатель"}</Text>
            </View>
            <View style={styles.alphaBadge}>
              <Text style={styles.alphaText}>Closed Alpha</Text>
            </View>
          </View>
        </View>
      </View>
      {fromCache ? <Text style={styles.cacheHint}>Профиль загружен из сохранённых данных</Text> : null}
      {sellerCapable && onSwitchMode ? (
        <Pressable style={styles.switchBtn} onPress={onSwitchMode} accessibilityRole="button" accessibilityLabel="Сменить режим">
          <MaterialCommunityIcons name="swap-horizontal" size={18} color={brand.primary} />
          <Text style={styles.switchText}>{mode === "buyer" ? "Режим продавца" : "Режим покупателя"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  meta: { flex: 1, gap: spacing.xs },
  name: { ...typography.h1, color: text.primary },
  email: { ...typography.body, color: text.secondary },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  modeBadge: { backgroundColor: brand.primarySoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  modeText: { ...typography.caption, color: brand.primary, fontWeight: "700" },
  alphaBadge: { backgroundColor: surface.backgroundMuted, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  alphaText: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  cacheHint: { ...typography.caption, color: text.muted },
  switchBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 44, alignSelf: "flex-start" },
  switchText: { ...typography.bodySmall, color: brand.primary, fontWeight: "600" },
});
