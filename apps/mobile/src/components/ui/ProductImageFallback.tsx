import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";

export function ProductImageFallback({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.wrap, compact ? styles.wrapCompact : null]}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="image-outline" size={compact ? 22 : 28} color={colors.orange} />
      </View>
      <Text style={styles.label}>Нет фото</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.gray100,
  },
  wrapCompact: { gap: spacing.xs },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typography.caption, color: colors.gray500, fontWeight: "600" },
});
