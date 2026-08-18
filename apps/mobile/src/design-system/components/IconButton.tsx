import { Animated, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { usePressScale } from "../../hooks/usePressScale";
import { border } from "../tokens/colors";
import { radii } from "../tokens/radius";

type IconButtonProps = PressableProps & {
  children: React.ReactNode;
  size?: number;
  variant?: "ghost" | "muted";
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  children,
  size = 44,
  variant = "ghost",
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: IconButtonProps) {
  const { scale, onPressIn: scaleIn, onPressOut: scaleOut } = usePressScale(0.92);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={(e) => {
          scaleIn();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scaleOut();
          onPressOut?.(e);
        }}
        style={({ pressed }) => [
          styles.base,
          variant === "muted" ? styles.muted : styles.ghost,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          },
          style,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  ghost: { backgroundColor: "transparent" },
  muted: { backgroundColor: border.default, borderRadius: radii.pill },
});
