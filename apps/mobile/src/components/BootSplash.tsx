import { useEffect, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCurrentBootStage } from "../boot/boot-stage";
import { bootStageToUserMessage } from "../boot/boot-stage-messages";
import { colors, spacing, typography } from "../theme/tokens";

export function BootSplash({ statusMessage }: { statusMessage?: string }) {
  const insets = useSafeAreaInsets();
  const [stageMessage, setStageMessage] = useState("Запускаем LOT");
  const pulse = useState(() => new Animated.Value(0.35))[0];

  useEffect(() => {
    const id = setInterval(() => {
      setStageMessage(bootStageToUserMessage(getCurrentBootStage()));
    }, 180);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const message = statusMessage ?? stageMessage;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.brandBlock}>
        <Image source={require("../../assets/splash-icon.png")} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.title}>ЛОТ</Text>
        <Text style={styles.tagline}>Покупайте. Продавайте.</Text>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { opacity: pulse }]} />
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
  brandBlock: { alignItems: "center", gap: spacing.sm },
  logo: { width: 88, height: 88 },
  title: { ...typography.display, color: colors.orange, fontSize: 34, letterSpacing: 1 },
  tagline: { ...typography.body, color: colors.gray700, fontWeight: "500" },
  progressBlock: { width: "100%", maxWidth: 280, gap: spacing.md, alignItems: "center" },
  track: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
    overflow: "hidden",
  },
  fill: {
    width: "42%",
    height: "100%",
    backgroundColor: colors.orange,
    borderRadius: 2,
  },
  status: { ...typography.caption, color: colors.gray500, textAlign: "center", minHeight: 18 },
});
