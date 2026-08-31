import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type TextStyle, type ViewStyle } from "react-native";

import { colors, layout, radii, spacing, typography } from "../../theme/tokens";

type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  size?: ButtonSize;
  fullWidth?: boolean;
  testID?: string;
};

function buttonHeight(size: ButtonSize): number {
  if (size === "sm") return layout.buttonHeightSm;
  if (size === "lg") return layout.buttonHeightLg;
  return layout.buttonHeight;
}

function buttonTextStyle(size: ButtonSize): TextStyle {
  return size === "sm" ? typography.buttonSm : typography.button;
}

function ButtonBase({
  label,
  loading,
  size = "md",
  fullWidth,
  disabled,
  style,
  variantStyle,
  textStyle,
  testID,
  ...rest
}: ButtonProps & { variantStyle: ViewStyle; textStyle: TextStyle }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={testID ?? label}
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        { minHeight: buttonHeight(size), opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1 },
        fullWidth ? styles.fullWidth : null,
        style as ViewStyle,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textStyle.color ?? colors.white} size="small" />
      ) : (
        <Text style={[buttonTextStyle(size), textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <ButtonBase {...props} variantStyle={styles.primary} textStyle={styles.primaryText} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <ButtonBase {...props} variantStyle={styles.secondary} textStyle={styles.secondaryText} />;
}

export function GhostButton(props: ButtonProps) {
  return <ButtonBase {...props} variantStyle={styles.ghost} textStyle={styles.ghostText} />;
}

export function DangerButton(props: ButtonProps) {
  return <ButtonBase {...props} variantStyle={styles.danger} textStyle={styles.dangerText} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: { alignSelf: "stretch" },
  primary: { backgroundColor: colors.orange },
  primaryText: { color: colors.white },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray300 },
  secondaryText: { color: colors.black },
  ghost: { backgroundColor: "transparent" },
  ghostText: { color: colors.orange },
  danger: { backgroundColor: colors.danger },
  dangerText: { color: colors.white },
});
