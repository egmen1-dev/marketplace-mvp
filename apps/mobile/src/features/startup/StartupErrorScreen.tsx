import { StyleSheet, Text, View } from "react-native";

import type { BootFailure } from "../../boot/boot-types";
import { BOOT_STAGE_LABELS } from "../../boot/boot-types";
import { PrimaryButton } from "../../components/ui";
import { colors, radii, spacing, typography } from "../../theme/tokens";

type Props = {
  failure: BootFailure;
  onRetry: () => void;
};

export function StartupErrorScreen({ failure, onRetry }: Props) {
  const stageLabel = BOOT_STAGE_LABELS[failure.stage];

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.heading}>Ошибка запуска</Text>

      <View style={styles.block}>
        <Text style={styles.label}>Этап</Text>
        <Text style={styles.value}>{stageLabel}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Причина</Text>
        <Text style={styles.value}>{failure.message}</Text>
      </View>

      {failure.httpStatus ? (
        <View style={styles.block}>
          <Text style={styles.label}>HTTP</Text>
          <Text style={styles.value}>{failure.httpStatus}</Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.label}>Код</Text>
        <Text style={styles.mono}>{failure.code}</Text>
      </View>

      <PrimaryButton label="Повторить" onPress={onRetry} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 360,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.gray100,
  },
  heading: {
    ...typography.title,
    color: colors.danger,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  block: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.gray500, textTransform: "uppercase" },
  value: { ...typography.body, color: colors.black },
  mono: { ...typography.caption, color: colors.gray700, fontFamily: "monospace" },
});
