import { StyleSheet, Text, View } from "react-native";

import { getMobileBuildInfo } from "../../config/build-info";
import { border, text } from "../../design-system/tokens/colors";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";

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
    borderTopColor: border.default,
    gap: spacing.xs,
    alignItems: "center",
  },
  line: { ...typography.caption, color: text.muted },
  value: { color: text.primary, fontWeight: "700", fontFamily: "monospace" },
});
