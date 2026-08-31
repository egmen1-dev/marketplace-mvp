import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SecondaryButton } from "../components/ui";
import { colors, layout, radii, spacing, typography } from "../theme/tokens";

export function LotCreatePreviewFooter({
  publishLabel,
  saveLabel,
  onPublish,
  onSave,
  onBack,
  publishing,
  saving,
  publishTestID = "lot-preview-submit",
}: {
  publishLabel: string;
  saveLabel: string;
  onPublish: () => void;
  onSave: () => void;
  onBack: () => void;
  publishing?: boolean;
  saving?: boolean;
  publishTestID?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <Pressable
        testID={publishTestID}
        accessibilityLabel={publishTestID}
        accessibilityRole="button"
        disabled={publishing}
        onPress={onPublish}
        style={({ pressed }) => [styles.primary, publishing ? styles.primaryDisabled : pressed ? styles.primaryPressed : null]}
      >
        {publishing ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.primaryLabel}>{publishLabel}</Text>
        )}
      </Pressable>
      <SecondaryButton label={saveLabel} fullWidth loading={saving} onPress={onSave} />
      <Pressable onPress={onBack} accessibilityRole="button" style={styles.backHit}>
        <Text style={styles.backLabel}>Назад</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  primary: {
    minHeight: layout.stickyCtaHeight,
    borderRadius: radii.md,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primaryPressed: {
    backgroundColor: colors.ctaPrimaryPressed,
  },
  primaryDisabled: {
    opacity: 0.7,
  },
  primaryLabel: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
  backHit: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backLabel: {
    ...typography.button,
    color: colors.gray700,
  },
});
