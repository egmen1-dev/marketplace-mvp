import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getBetaConfig } from "./config";
import { colors, spacing, typography } from "../theme/tokens";

export function BetaBanner() {
  const config = getBetaConfig();
  const insets = useSafeAreaInsets();
  if (!config.betaBannerEnabled) return null;

  const expired = config.buildExpired;

  return (
    <View style={[styles.banner, expired && styles.bannerExpired, { paddingTop: Math.max(insets.top > 0 ? 2 : spacing.xs, spacing.xs) }]}>
      <Text style={styles.text} numberOfLines={1}>
        {expired ? "Сборка истекла" : "Beta"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.orange,
    paddingBottom: 4,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 22,
  },
  bannerExpired: {
    backgroundColor: "#c0392b",
  },
  text: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.white,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
