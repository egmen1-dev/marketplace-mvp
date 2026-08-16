import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { logout } from "../../src/api/client";
import { fetchMobileUpdate, postTelemetry } from "../../src/api/endpoints";
import { loadAppConfig } from "../../src/config/env";
import { getSessionMeta } from "../../src/storage/secure-session";
import { useAppStore } from "../../src/store/app-store";
import { buildErrorReport } from "../../src/telemetry/error-report";
import { colors, spacing, typography } from "../../src/theme/tokens";
import type { MobileUpdateInfo } from "../../src/api/endpoints";

export default function ProfileScreen() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const [role, setRole] = useState<string>("—");
  const [updateInfo, setUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  const config = loadAppConfig();

  useEffect(() => {
    getSessionMeta().then((meta) => setRole(meta?.role ?? "—"));
  }, []);

  useEffect(() => {
    fetchMobileUpdate()
      .then(setUpdateInfo)
      .catch(() => setUpdateInfo(null));
  }, []);

  const hasUpdate =
    updateInfo &&
    updateInfo.downloadUrl &&
    updateInfo.versionCode > Number(config.buildNumber) &&
    updateInfo.rollout.eligible;

  async function onUpdate() {
    if (!updateInfo?.downloadUrl) return;
    await postTelemetry({ screen: "profile", event: "update_requested", errorCode: updateInfo.versionName });
    await Linking.openURL(updateInfo.downloadUrl);
  }

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  async function onReportError() {
    const report = buildErrorReport("profile");
    await postTelemetry({ screen: "profile", event: "error_report_requested" });
    await Share.share({
      message: JSON.stringify(report, null, 2),
      title: "ЛОТ Alpha — сообщить об ошибке",
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Профиль</Text>
      <Text style={styles.caption}>Роль: {role}</Text>
      <Text style={styles.caption}>v{config.appVersion} ({config.buildNumber}) · {config.releaseChannel}</Text>
      <Text style={styles.caption}>API mobile-v1 · канал alpha</Text>
      {hasUpdate ? (
        <View style={styles.updateBanner} accessibilityLabel="Доступно обновление">
          <Text style={styles.updateTitle}>Доступна версия {updateInfo.versionName}</Text>
          {updateInfo.releaseNotes.slice(0, 2).map((note) => (
            <Text key={note} style={styles.updateNote}>
              • {note}
            </Text>
          ))}
          <Pressable style={styles.updateButton} onPress={onUpdate}>
            <Text style={styles.updateButtonText}>Обновить</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable style={styles.report} onPress={onReportError} accessibilityLabel="Сообщить об ошибке">
        <Text style={styles.reportText}>Сообщить об ошибке</Text>
      </Pressable>
      <Pressable
        style={styles.switch}
        onPress={() => {
          setMode(mode === "buyer" ? "seller" : "buyer");
          router.replace(mode === "buyer" ? "/(tabs)/seller-home" : "/(tabs)");
        }}
      >
        <Text style={styles.switchText}>{mode === "buyer" ? "Переключить на Продавца" : "Переключить на Покупателя"}</Text>
      </Pressable>
      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Выйти</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.title },
  caption: { ...typography.caption, color: colors.gray500 },
  updateBanner: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.gray100,
  },
  updateTitle: { ...typography.subtitle },
  updateNote: { ...typography.caption, color: colors.gray900 },
  updateButton: {
    backgroundColor: colors.black,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  updateButtonText: { color: colors.white, ...typography.subtitle },
  switch: { backgroundColor: colors.gray100, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  switchText: { ...typography.subtitle },
  report: { borderWidth: 1, borderColor: colors.gray200, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reportText: { ...typography.subtitle, color: colors.gray900 },
  logout: { backgroundColor: colors.black, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoutText: { color: colors.white, ...typography.subtitle },
});
