import { StyleSheet, Text, View } from "react-native";

import { GhostButton } from "../forms/buttons";
import { semantic, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export function SectionErrorCard({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text style={styles.title}>Не удалось загрузить раздел</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? <GhostButton label="Повторить" size="sm" onPress={onRetry} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: semantic.warningSoft,
    borderWidth: 1,
    borderColor: semantic.warning,
    gap: spacing.sm,
  },
  title: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  message: { ...typography.caption, color: text.muted },
  btn: { alignSelf: "flex-start" },
});
