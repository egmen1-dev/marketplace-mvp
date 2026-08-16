import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import {
  BOOT_HARD_TIMEOUT_MS,
  runStartupPipeline,
  type BootFailure,
  type StartupPipelineResult,
} from "../src/boot/run-startup-pipeline";
import { bootPipelineHungFailure } from "../src/boot/boot-errors";
import { bootLogger } from "../src/boot/boot-logger";
import { getCurrentBootId, getCurrentRetryCount } from "../src/boot/boot-session";
import { saveStartupReport } from "../src/boot/boot-storage";
import { emitStartupEvent, STARTUP_EVENTS } from "../src/boot/startup-telemetry";
import { UnsupportedClientScreen } from "../src/components/UnsupportedClientScreen";
import { StartupErrorScreen } from "../src/features/startup/StartupErrorScreen";
import type { MobileUpdateInfo } from "../src/api/endpoints";
import { useAppStore } from "../src/store/app-store";
import { colors, spacing, typography } from "../src/theme/tokens";

export default function BootScreen() {
  const router = useRouter();
  const setBootstrapped = useAppStore((s) => s.setBootstrapped);
  const setRemoteConfig = useAppStore((s) => s.setRemoteConfig);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const setPendingUpdate = useAppStore((s) => s.setPendingUpdate);
  const [failure, setFailure] = useState<BootFailure | null>(null);
  const [unsupported, setUnsupported] = useState<MobileUpdateInfo | null>(null);
  const [ready, setReady] = useState<"login" | "app" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const finishedRef = useRef(false);

  const applyResult = useCallback(
    (result: StartupPipelineResult) => {
      if (result.status === "unsupported") {
        setUnsupported(result.update);
        return;
      }
      if (result.status === "error") {
        setFailure(result.failure);
        return;
      }
      if (result.remoteConfig) setRemoteConfig(result.remoteConfig);
      if (result.role) setUserRole(result.role);
      if (result.update) setPendingUpdate(result.update);
      setBootstrapped(true);
      setReady(result.destination);
    },
    [setBootstrapped, setPendingUpdate, setRemoteConfig, setUserRole],
  );

  useEffect(() => {
    let cancelled = false;
    finishedRef.current = false;
    setFailure(null);
    setUnsupported(null);
    setReady(null);

    void runStartupPipeline({ isRetry: attempt > 0 }).then((result) => {
      if (cancelled) return;
      finishedRef.current = true;
      applyResult(result);
    });

    const hardTimeout = setTimeout(() => {
      if (cancelled || finishedRef.current) return;
      finishedRef.current = true;
      const durationMs = bootLogger.elapsedMs();
      const hungFailure = bootPipelineHungFailure(durationMs);
      const report = bootLogger.complete(false, undefined, {
        bootId: getCurrentBootId(),
        retryCount: getCurrentRetryCount(),
      });
      void saveStartupReport(report);
      emitStartupEvent(STARTUP_EVENTS.bootAborted, hungFailure.code);
      setFailure(hungFailure);
    }, BOOT_HARD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(hardTimeout);
    };
  }, [attempt, applyResult]);

  const openBuildInfo = useCallback(() => {
    router.push("/build-info");
  }, [router]);

  if (unsupported) {
    return (
      <View style={styles.container}>
        <UnsupportedClientScreen update={unsupported} />
      </View>
    );
  }

  if (ready === "app") return <Redirect href="/(tabs)" />;
  if (ready === "login") return <Redirect href="/login" />;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityHint="Удерживайте для информации о билде"
        onLongPress={openBuildInfo}
        delayLongPress={800}
        style={styles.brand}
      >
        <Image source={require("../assets/splash-icon.png")} style={styles.logo} />
        <Text style={styles.title}>ЛОТ</Text>
        <Text style={styles.tagline}>Маркетплейс, которому доверяют</Text>
      </Pressable>
      {failure ? (
        <StartupErrorScreen
          failure={failure}
          bootId={getCurrentBootId()}
          retryCount={getCurrentRetryCount()}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : (
        <>
          <ActivityIndicator color={colors.orange} size="large" />
          <Text style={styles.caption}>Загрузка…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, padding: spacing.xl },
  brand: { alignItems: "center", gap: spacing.md, marginBottom: spacing.xxl },
  logo: { width: 96, height: 96 },
  title: { ...typography.display, color: colors.orange, fontSize: 36 },
  tagline: { ...typography.body, color: colors.gray500 },
  caption: { ...typography.caption, color: colors.gray500, marginTop: spacing.md },
});
