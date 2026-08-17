import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type TextStyle, type ViewStyle } from "react-native";

import { brand, border, semantic, text } from "../../design-system/tokens/colors";
import { shadows } from "../../design-system/tokens/elevation";
import { layout } from "../../design-system/tokens/layout";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";

type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  size?: ButtonSize;
  fullWidth?: boolean;
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
  ...rest
}: ButtonProps & { variantStyle: ViewStyle; textStyle: TextStyle }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
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
        <ActivityIndicator color={textStyle.color ?? text.inverse} size="small" />
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
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: { alignSelf: "stretch" },
  primary: { backgroundColor: brand.primary, ...shadows.elevated },
  primaryText: { color: text.inverse },
  secondary: { backgroundColor: brand.paper, borderWidth: 1, borderColor: border.default },
  secondaryText: { color: text.primary },
  ghost: { backgroundColor: "transparent" },
  ghostText: { color: brand.primary },
  danger: { backgroundColor: semantic.danger },
  dangerText: { color: text.inverse },
});
