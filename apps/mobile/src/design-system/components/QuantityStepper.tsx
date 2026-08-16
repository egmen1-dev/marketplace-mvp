import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { IconButton } from "./IconButton";
import { border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  value: number;
  min?: number;
  max?: number;
  busy?: boolean;
  disabled?: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
};

export const QuantityStepper = memo(function QuantityStepper({
  value,
  min = 1,
  max = 99,
  busy,
  disabled,
  onDecrement,
  onIncrement,
}: Props) {
  const canDecrement = value > min && !busy && !disabled;
  const canIncrement = value < max && !busy && !disabled;

  return (
    <View style={styles.wrap} accessibilityRole="adjustable" accessibilityLabel={`Количество ${value}`}>
      <IconButton
        accessibilityLabel="Уменьшить количество"
        variant="muted"
        disabled={!canDecrement}
        onPress={onDecrement}
        size={44}
      >
        <MaterialCommunityIcons name="minus" size={20} color={canDecrement ? text.primary : text.disabled} />
      </IconButton>
      <View style={styles.valueWrap}>
        {busy ? (
          <ActivityIndicator size="small" color={text.primary} />
        ) : (
          <Text style={styles.value} accessibilityLiveRegion="polite">
            {value}
          </Text>
        )}
      </View>
      <IconButton
        accessibilityLabel="Увеличить количество"
        variant="muted"
        disabled={!canIncrement}
        onPress={onIncrement}
        size={44}
      >
        <MaterialCommunityIcons name="plus" size={20} color={canIncrement ? text.primary : text.disabled} />
      </IconButton>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: surface.backgroundMuted,
    borderRadius: radii.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: border.default,
  },
  valueWrap: {
    minWidth: 36,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
});
