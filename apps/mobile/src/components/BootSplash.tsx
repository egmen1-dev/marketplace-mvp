import { useEffect, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCurrentBootStage } from "../boot/boot-stage";
import { bootStageToUserMessage } from "../boot/boot-stage-messages";
import { colors, radii, spacing, typography } from "../theme/tokens";

export function BootSplash({ statusMessage }: { statusMessage?: string }) {
  const insets = useSafeAreaInsets();
  const [stageMessage, setStageMessage] = useState("Запускаем ЛОТ");
  const progress = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    const id = setInterval(() => {
      setStageMessage(bootStageToUserMessage(getCurrentBootStage()));
    }, 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const message = statusMessage ?? stageMessage;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["-100%", "220%"],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.brandBlock}>
        <View style={styles.logoRing}>
          <Image source={require("../../assets/splash-icon.png")} style={styles.logo} accessibilityIgnoresInvertColors />
        </View>
        <Text style={styles.title}>ЛОТ</Text>
        <Text style={styles.tagline}>Покупайте. Продавайте.</Text>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { transform: [{ translateX }] }]} />
        </View>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xxl,
  },
  brandBlock: { alignItems: "center", gap: spacing.md, flexShrink: 0 },
  logoRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE0C2",
  },
  logo: { width: 72, height: 72 },
  title: { ...typography.display, color: colors.orange, fontSize: 36, letterSpacing: 1.5, fontWeight: "800" },
  tagline: { ...typography.body, color: colors.gray700, fontWeight: "600" },
  progressBlock: { width: "100%", maxWidth: 260, gap: spacing.md, alignItems: "center" },
  track: {
    width: "100%",
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.gray200,
    overflow: "hidden",
  },
  fill: {
    width: "38%",
    height: "100%",
    backgroundColor: colors.orange,
    borderRadius: radii.pill,
  },
  status: { ...typography.caption, color: colors.gray500, textAlign: "center", minHeight: 18 },
});
