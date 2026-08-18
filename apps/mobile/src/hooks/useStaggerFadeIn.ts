import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export function useStaggerFadeIn(count: number, baseDelay = 0, step = 80, duration = 320) {
  const values = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      step,
      values.map((opacity, index) =>
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay: baseDelay + index * step,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [baseDelay, duration, step, values]);

  return values;
}
