import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, layout, radii, spacing, typography } from "../theme/tokens";

export function LotCreateStickyFooter({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const isDisabled = disabled || loading;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          isDisabled ? styles.buttonDisabled : pressed ? styles.buttonPressed : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
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
  },
  button: {
    minHeight: layout.stickyCtaHeight,
    borderRadius: radii.md,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonPressed: {
    backgroundColor: colors.ctaPrimaryPressed,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
});
