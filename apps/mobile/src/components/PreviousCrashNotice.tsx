import * as Clipboard from "expo-clipboard";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { clearPreviousCrash, type PreviousCrashRecord } from "../boot/previous-crash";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = {
  record: PreviousCrashRecord;
  onDismiss: () => void;
};

export function PreviousCrashNotice({ record, onDismiss }: Props) {
  const copy = async () => {
    await Clipboard.setStringAsync(
      `Previous crash ${record.crashId}\nStage: ${record.stage}\n${record.message}\n${record.versionName} (${record.versionCode}) ${record.gitSha}`,
    );
  };

  const dismiss = async () => {
    await clearPreviousCrash();
    onDismiss();
  };

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>Предыдущий запуск завершился аварийно</Text>
      <Text style={styles.body}>
        ID: {record.crashId} · {record.stage} · {record.message}
      </Text>
      <View style={styles.actions}>
        <Pressable onPress={copy} style={styles.button}>
          <Text style={styles.buttonText}>Копировать</Text>
        </Pressable>
        <Pressable onPress={dismiss} style={styles.buttonSecondary}>
          <Text style={styles.buttonSecondaryText}>Закрыть</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.danger,
  },
  title: { ...typography.subtitle, color: colors.danger },
  body: { ...typography.caption, color: colors.gray700 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  button: {
    backgroundColor: colors.danger,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  buttonText: { ...typography.caption, color: colors.white, fontWeight: "600" },
  buttonSecondary: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  buttonSecondaryText: { ...typography.caption, color: colors.gray700 },
});
