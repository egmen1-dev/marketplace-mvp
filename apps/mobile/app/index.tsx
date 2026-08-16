import { Redirect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { fetchBootstrap, fetchRemoteConfig, postTelemetry } from "../src/api/endpoints";
import { emitStartupEvent, STARTUP_EVENTS } from "../src/boot/startup-telemetry";
import { withTimeout } from "../src/boot/with-timeout";
import { PrimaryButton } from "../src/components/ui";
import { getAccessToken, getSessionMeta } from "../src/storage/secure-session";
import { useAppStore } from "../src/store/app-store";
import { colors, spacing, typography } from "../src/theme/tokens";

const BOOT_STEP_TIMEOUT_MS = 8_000;
const BOOT_HARD_TIMEOUT_MS = 10_000;

export default function BootScreen() {
  const setBootstrapped = useAppStore((s) => s.setBootstrapped);
  const setRemoteConfig = useAppStore((s) => s.setRemoteConfig);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<"login" | "app" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const finishedRef = useRef(false);

  const runBoot = useCallback(async (cancelled: () => boolean) => {
    finishedRef.current = false;
    setError(null);
    setReady(null);
    emitStartupEvent(STARTUP_EVENTS.appStart);

    try {
      emitStartupEvent(STARTUP_EVENTS.bootstrapStart);
      await withTimeout("bootstrap", fetchBootstrap(), BOOT_STEP_TIMEOUT_MS);
      emitStartupEvent(STARTUP_EVENTS.bootstrapOk);

      emitStartupEvent(STARTUP_EVENTS.configStart);
      const remote = await withTimeout("remote_config", fetchRemoteConfig(), BOOT_STEP_TIMEOUT_MS).catch((err) => {
        emitStartupEvent(STARTUP_EVENTS.configFail, err instanceof Error ? err.name : "config_error");
        return null;
      });
      if (remote) emitStartupEvent(STARTUP_EVENTS.configOk);

      void postTelemetry({ screen: "boot", event: "session_start" }).catch(() => null);

      emitStartupEvent(STARTUP_EVENTS.sessionRestoreStart);
      const [token, meta] = await withTimeout(
        "session_restore",
        Promise.all([getAccessToken(), getSessionMeta()]),
        BOOT_STEP_TIMEOUT_MS,
      );
      emitStartupEvent(STARTUP_EVENTS.sessionRestoreOk);

      if (cancelled()) return;
      if (remote?.config) setRemoteConfig(remote.config);
      if (meta?.role) setUserRole(meta.role);
      setBootstrapped(true);
      finishedRef.current = true;
      emitStartupEvent(STARTUP_EVENTS.navigationReady, token && meta ? "app" : "login");
      setReady(token && meta ? "app" : "login");
    } catch (err) {
      if (cancelled()) return;
      finishedRef.current = true;
      const message = err instanceof Error ? err.message : "Network error";
      if (message.includes("bootstrap")) emitStartupEvent(STARTUP_EVENTS.bootstrapFail, message.slice(0, 80));
      if (message.includes("session_restore")) emitStartupEvent(STARTUP_EVENTS.sessionRestoreFail, message.slice(0, 80));
      setError(message.includes("timed out") ? "Не удалось загрузить приложение" : message);
    }
  }, [setBootstrapped, setRemoteConfig, setUserRole]);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    void runBoot(isCancelled);

    const hardTimeout = setTimeout(() => {
      if (cancelled || finishedRef.current) return;
      finishedRef.current = true;
      emitStartupEvent(STARTUP_EVENTS.bootTimeout);
      setError("Не удалось загрузить приложение");
    }, BOOT_HARD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(hardTimeout);
    };
  }, [attempt, runBoot]);

  if (ready === "app") return <Redirect href="/(tabs)" />;
  if (ready === "login") return <Redirect href="/login" />;

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image source={require("../assets/splash-icon.png")} style={styles.logo} />
        <Text style={styles.title}>ЛОТ</Text>
        <Text style={styles.tagline}>Маркетплейс, которому доверяют</Text>
      </View>
      {error ? (
        <View style={styles.errorBlock}>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton label="Повторить" onPress={() => setAttempt((n) => n + 1)} fullWidth />
        </View>
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
  errorBlock: { width: "100%", maxWidth: 320, gap: spacing.md },
  error: { color: colors.danger, textAlign: "center" },
});
