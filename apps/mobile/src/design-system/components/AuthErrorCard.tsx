import { StyleSheet, Text, View } from "react-native";

import { GhostButton } from "../../components/ui/buttons";
import { semantic, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export function AuthErrorCard({
  title = "Не удалось войти",
  message,
  onRetry,
  supportLabel = "Сообщить об ошибке",
  onSupport,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  supportLabel?: string;
  onSupport?: () => void;
}) {
  return (
    <View style={styles.card} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>!</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.hint}>Проверьте email и пароль или восстановите доступ ниже.</Text>
        <View style={styles.actions}>
          {onRetry ? <GhostButton label="Повторить" size="sm" onPress={onRetry} /> : null}
          {onSupport ? <GhostButton label={supportLabel} size="sm" onPress={onSupport} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: semantic.dangerSoft,
    borderWidth: 1,
    borderColor: semantic.danger,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: semantic.danger,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  icon: { ...typography.button, color: text.inverse },
  body: { flex: 1, gap: spacing.xs },
  title: { ...typography.h3, color: text.primary },
  message: { ...typography.bodySmall, color: text.secondary },
  hint: { ...typography.caption, color: text.muted },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
});
