import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type ViewStyle } from "react-native";

import { colors } from "../tokens/colors";
import { radii } from "../tokens/radius";

export function ShimmerBlock({
  height = 16,
  width = "100%",
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { height, width, opacity }, style]} />;
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.gray200, borderRadius: radii.sm },
});
