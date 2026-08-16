import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { usePressScale } from "../../hooks/usePressScale";
import { brand, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { opacity } from "../tokens/opacity";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type PrimaryCTAProps = PressableProps & {
  label: string;
  loading?: boolean;
  success?: boolean;
  fullWidth?: boolean;
};

export function PrimaryCTA({ label, loading, success, fullWidth, disabled, onPress, ...rest }: PrimaryCTAProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const progress = useRef(new Animated.Value(0)).current;
  const isDisabled = disabled || loading || success;

  useEffect(() => {
    if (!loading) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(progress, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
    ).start();
  }, [loading, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["15%", "100%"],
  });

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth ? styles.fullWidth : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.button,
          {
            opacity: isDisabled ? opacity.disabled : pressed ? opacity.pressed : 1,
          },
        ]}
        {...rest}
      >
        {success ? (
          <View style={styles.row}>
            <MaterialCommunityIcons name="check-circle" size={22} color={text.inverse} />
            <Text style={styles.label}>Готово</Text>
          </View>
        ) : loading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.label}>Входим…</Text>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: "stretch" },
  button: {
    minHeight: layout.buttonHeightLg,
    borderRadius: radii.lg,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    ...shadows.elevated,
  },
  label: { ...typography.button, color: text.inverse },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  loadingWrap: { alignSelf: "stretch", gap: spacing.sm, paddingHorizontal: spacing.sm },
  progressTrack: {
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: text.inverse,
  },
});
