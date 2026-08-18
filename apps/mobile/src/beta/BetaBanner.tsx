import { StyleSheet, Text, View } from "react-native";

import { getBetaConfig } from "./config";
import { getBuildInfo } from "./build-info";
import { colors, spacing, typography } from "../theme/tokens";

export function BetaBanner() {
  const config = getBetaConfig();
  if (!config.betaBannerEnabled) return null;

  const build = getBuildInfo();
  const expired = config.buildExpired;

  return (
    <View style={[styles.banner, expired && styles.bannerExpired]}>
      <Text style={styles.text}>
        {expired ? "Сборка истекла" : config.betaBannerText} · v{build.appVersion} ({build.buildNumber})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.orange,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  bannerExpired: {
    backgroundColor: "#c0392b",
  },
  text: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
  },
});
