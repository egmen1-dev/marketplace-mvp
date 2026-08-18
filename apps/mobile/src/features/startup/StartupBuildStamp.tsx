import { StyleSheet, Text, View } from "react-native";

import { getMobileBuildInfo } from "../../config/build-info";
import { colors, spacing, typography } from "../../theme/tokens";

/** Always-visible build stamp on startup error — confirms installed APK version. */
export function StartupBuildStamp() {
  const info = getMobileBuildInfo();

  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={`Version ${info.versionName}, build ${info.commit}`}>
      <Text style={styles.line}>
        Version: <Text style={styles.value}>{info.versionName}</Text>
      </Text>
      <Text style={styles.line}>
        Build: <Text style={styles.value}>{info.commit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: spacing.xs,
    alignItems: "center",
  },
  line: { ...typography.caption, color: colors.gray500 },
  value: { color: colors.black, fontWeight: "700", fontFamily: "monospace" },
});
