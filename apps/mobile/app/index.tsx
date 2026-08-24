import { Redirect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";

import {
  BOOT_HARD_TIMEOUT_MS,
  runStartupPipeline,
  type StartupPipelineResult,
} from "../src/boot/run-startup-pipeline";
import {
  formatBootReportJson,
  formatBootReportSummary,
  getCurrentBootStage,
  getStartupBootReport,
} from "../src/boot/startup-diagnostics";
import { emitStartupEvent, emitStartupFailureReport, STARTUP_EVENTS } from "../src/boot/startup-telemetry";
import { BootSplash } from "../src/components/BootSplash";
import { PrimaryButton, SecondaryButton } from "../src/components/ui";
import { UnsupportedClientScreen } from "../src/components/UnsupportedClientScreen";
import type { MobileUpdateInfo } from "../src/api/endpoints";
import { isInstallableUpdate } from "../src/update/update-availability";
import { useAppStore } from "../src/store/app-store";
import { colors, spacing, typography } from "../src/theme/tokens";

export default function BootScreen() {
  const setBootstrapped = useAppStore((s) => s.setBootstrapped);
  const setBootDegraded = useAppStore((s) => s.setBootDegraded);
  const setRemoteConfig = useAppStore((s) => s.setRemoteConfig);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const setPendingUpdate = useAppStore((s) => s.setPendingUpdate);
  const setUpdateAvailable = useAppStore((s) => s.setUpdateAvailable);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
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
        setError(result.userMessage);
        setErrorDetails(result.message);
        return;
      }
      setError(null);
      setErrorDetails(null);
      if (result.remoteConfig) setRemoteConfig(result.remoteConfig);
      if (result.role) setUserRole(result.role);
      if (result.update) {
        setPendingUpdate(result.update);
        setUpdateAvailable(isInstallableUpdate(result.update) ? result.update : null);
      }
      setBootDegraded(Boolean(result.degraded));
      setBootstrapped(true);
      setReady(result.destination);
    },
    [setBootstrapped, setBootDegraded, setPendingUpdate, setRemoteConfig, setUpdateAvailable, setUserRole],
  );

  useEffect(() => {
    let cancelled = false;
    finishedRef.current = false;
    setError(null);
    setErrorDetails(null);
    setUnsupported(null);
    setReady(null);

    void runStartupPipeline().then((result) => {
      if (cancelled) return;
      finishedRef.current = true;
      applyResult(result);
    });

    const hardTimeout = setTimeout(() => {
      if (cancelled || finishedRef.current) return;
      finishedRef.current = true;
      const stage = getCurrentBootStage();
      const report = getStartupBootReport();
      emitStartupEvent(STARTUP_EVENTS.bootTimeout, stage);
      emitStartupFailureReport(report);
      setError("Не удалось загрузить приложение");
      setErrorDetails(
        `${formatBootReportSummary(report)}\n\nТаймаут загрузки (${BOOT_HARD_TIMEOUT_MS}ms) на этапе: ${stage}`,
      );
    }, BOOT_HARD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(hardTimeout);
    };
  }, [attempt, applyResult]);

  async function shareDiagnostics() {
    const report = getStartupBootReport();
    await Share.share({
      message: formatBootReportJson(report),
      title: "ЛОТ — диагностика запуска",
    });
  }

  if (unsupported) {
    return (
      <View style={styles.container}>
        <UnsupportedClientScreen update={unsupported} />
      </View>
    );
  }

  if (ready === "app") return <Redirect href="/(tabs)" />;
  if (ready === "login") return <Redirect href="/login" />;

  if (error) {
    return (
      <View style={styles.container}>
        <BootSplash statusMessage="Не удалось запустить приложение" />
        <View style={styles.errorBlock}>
          <Text style={styles.error}>{error}</Text>
          {errorDetails ? (
            <ScrollView style={styles.detailsScroll} nestedScrollEnabled>
              <Text style={styles.details} selectable>
                {errorDetails}
              </Text>
            </ScrollView>
          ) : null}
          <PrimaryButton label="Повторить" onPress={() => setAttempt((n) => n + 1)} fullWidth />
          <SecondaryButton label="Отправить диагностику" onPress={shareDiagnostics} fullWidth />
        </View>
      </View>
    );
  }

  return <BootSplash />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  errorBlock: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xxl,
    gap: spacing.md,
    maxWidth: 360,
    alignSelf: "center",
  },
  error: { color: colors.danger, textAlign: "center", ...typography.subtitle },
  detailsScroll: { maxHeight: 160, borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: spacing.sm },
  details: { ...typography.caption, color: colors.gray700, fontFamily: "monospace" },
});
