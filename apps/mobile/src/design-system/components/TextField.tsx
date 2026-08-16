import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { border, semantic, surface, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  success?: string | null;
  loading?: boolean;
  disabled?: boolean;
  rightAccessory?: React.ReactNode;
};

export function TextField({
  label,
  hint,
  error,
  success,
  loading,
  disabled,
  rightAccessory,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const isDisabled = disabled || loading || editable === false;
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success) && !hasError;

  let borderColor: string = border.default;
  let backgroundColor: string = surface.background;
  if (isDisabled) {
    borderColor = border.default;
    backgroundColor = surface.backgroundMuted;
  } else if (hasError) {
    borderColor = semantic.danger;
    backgroundColor = semantic.dangerSoft;
  } else if (hasSuccess) {
    borderColor = semantic.success;
    backgroundColor = semantic.successSoft;
  } else if (focused) {
    borderColor = border.focus;
    backgroundColor = surface.background;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} accessibilityRole="text">
        {label}
      </Text>
      <View style={[styles.field, { borderColor, backgroundColor }]}>
        <TextInput
          {...rest}
          editable={!isDisabled}
          placeholderTextColor={text.muted}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
        />
        {loading ? (
          <View style={styles.accessory}>
            <ActivityIndicator color={border.focus} size="small" />
          </View>
        ) : rightAccessory ? (
          <View style={styles.accessory}>{rightAccessory}</View>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : success ? (
        <Text style={styles.success}>{success}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const FIELD_HEIGHT = Math.max(layout.inputHeight + 8, 52);

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { ...typography.bodySmall, color: text.secondary, fontWeight: "600" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radii.lg,
    minHeight: FIELD_HEIGHT,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: text.primary,
    paddingVertical: spacing.md,
  },
  accessory: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  hint: { ...typography.caption, color: text.muted },
  error: { ...typography.caption, color: semantic.danger, fontWeight: "500" },
  success: { ...typography.caption, color: semantic.success, fontWeight: "500" },
});
