import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { logout } from "../../src/api/client";
import { fetchMobileUpdate, postTelemetry, submitProductFeedback } from "../../src/api/endpoints";
import { getBuildInfo } from "../../src/beta/build-info";
import { loadAppConfig } from "../../src/config/env";
import { Avatar, GhostButton, PrimaryButton } from "../../src/components/ui";
import { ProfileMenu } from "../../src/components/ProfileMenu";
import { getSessionMeta } from "../../src/storage/secure-session";
import { useAppStore } from "../../src/store/app-store";
import { buildErrorReport } from "../../src/telemetry/error-report";
import { startApkDownload } from "../../src/update/download-apk";
import { UPDATE_ANALYTICS } from "../../src/update/types";
import { isUpdateEligibleForInstall } from "../../src/utils/update-eligibility";
import { colors, spacing, typography } from "../../src/theme/tokens";
import type { MobileUpdateInfo } from "../../src/api/endpoints";

export default function ProfileScreen() {
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [email, setEmail] = useState<string>("—");
  const [updateInfo, setUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  const config = loadAppConfig();
  const buildInfo = getBuildInfo();

  useEffect(() => {
    getSessionMeta().then((meta) => {
      if (meta?.userId) setEmail(meta.userId.slice(0, 8) + "…");
    });
  }, []);

  useEffect(() => {
    fetchMobileUpdate()
      .then(setUpdateInfo)
      .catch(() => setUpdateInfo(null));
  }, []);

  const hasUpdate = isUpdateEligibleForInstall(updateInfo, Number(config.buildNumber));

  async function onUpdate() {
    if (!updateInfo) return;
    await postTelemetry({ screen: "profile", event: UPDATE_ANALYTICS.started, errorCode: updateInfo.versionName });
    await startApkDownload(updateInfo);
  }

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  async function onReportError() {
    const report = buildErrorReport("profile");
    await postTelemetry({ screen: "profile", event: "error_report_requested" });
    await submitProductFeedback({
      content: JSON.stringify(report),
      screen: "profile",
    }).catch(() => null);
    await Share.share({
      message: JSON.stringify(report, null, 2),
      title: "ЛОТ — сообщить об ошибке",
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.identityCard}>
        <Avatar label={email} size={56} />
        <View style={styles.identityText}>
          <Text style={styles.title}>Аккаунт</Text>
          <Text style={styles.subtitle}>ID: {email}</Text>
        </View>
      </View>

      <ProfileMenu
        sellerCapable={sellerCapable}
        onPersonalData={() => Linking.openURL(`${config.apiBaseUrl}/account/settings`)}
        onFeedback={() => router.push("/feedback")}
        onSupport={onReportError}
        onAbout={() => Linking.openURL(`${config.apiBaseUrl}/about`)}
        footer={
          <>
            {hasUpdate ? (
              <View style={styles.updateBanner}>
                <Text style={styles.updateTitle}>
                  {updateInfo?.updateState === "REQUIRED_UPDATE"
                    ? "Требуется обновление"
                    : `Доступна версия ${updateInfo?.versionName}`}
                </Text>
                <PrimaryButton label="Обновить" onPress={onUpdate} size="sm" />
              </View>
            ) : null}

            <GhostButton label="Сообщить об ошибке" onPress={onReportError} fullWidth />
            <Pressable style={styles.logout} onPress={onLogout} accessibilityRole="button" accessibilityLabel="Выйти">
              <Text style={styles.logoutText}>Выйти</Text>
            </Pressable>

            <Text style={styles.version}>
              Версия {buildInfo.appVersion} ({buildInfo.buildNumber}) · {buildInfo.releaseChannel}
              {"\n"}Канал: {buildInfo.channel} · API: {buildInfo.apiBaseUrl}
              {"\n"}Commit: {buildInfo.commitSha} · Сборка: {buildInfo.buildTime}
            </Text>
          </>
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.gray100 },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  identityText: { flex: 1 },
  title: { ...typography.h2 },
  subtitle: { ...typography.caption, color: colors.gray500 },
  updateBanner: {
    borderWidth: 1,
    borderColor: colors.orangeSoft,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.orangeSoft,
  },
  updateTitle: { ...typography.h3, color: colors.black },
  logout: {
    backgroundColor: colors.white,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.danger,
    marginTop: spacing.sm,
  },
  logoutText: { color: colors.danger, ...typography.button },
  version: { ...typography.caption, color: colors.gray500, textAlign: "center", marginTop: spacing.sm },
});
