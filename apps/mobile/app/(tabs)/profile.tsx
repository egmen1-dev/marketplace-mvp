import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { fetchMobileUpdate, postTelemetry } from "../../src/api/endpoints";
import { loadAppConfig } from "../../src/config/env";
import { Avatar } from "../../src/design-system/primitives/Badge";
import { GhostButton, PrimaryButton, SecondaryButton } from "../../src/design-system/forms/buttons";
import { SectionHeader } from "../../src/design-system/layout/ScreenLayout";
import { useProfileData } from "../../src/features/profile/useProfileData";
import { buildErrorReport } from "../../src/telemetry/error-report";
import { startApkDownload } from "../../src/update/download-apk";
import { UPDATE_ANALYTICS } from "../../src/update/types";
import { colors, spacing, typography } from "../../src/theme/tokens";
import type { MobileUpdateInfo } from "../../src/update/types";

export default function ProfileScreen() {
  const profile = useProfileData();
  const [updateInfo, setUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  const config = loadAppConfig();

  useEffect(() => {
    fetchMobileUpdate()
      .then(setUpdateInfo)
      .catch(() => setUpdateInfo(null));
  }, []);

  const hasUpdate =
    updateInfo &&
    updateInfo.updateState !== "NO_UPDATE" &&
    updateInfo.downloadUrl &&
    updateInfo.versionCode > Number(config.buildNumber) &&
    updateInfo.rollout.eligible;

  async function onUpdate() {
    if (!updateInfo) return;
    await postTelemetry({ screen: "profile", event: UPDATE_ANALYTICS.started, errorCode: updateInfo.versionName });
    await startApkDownload(updateInfo);
  }

  async function onReportError() {
    const report = buildErrorReport("profile");
    await postTelemetry({ screen: "profile", event: "error_report_requested" });
    await profile.submitFeedback({
      content: JSON.stringify(report),
      screen: "profile",
    }).catch(() => null);
    await Share.share({
      message: JSON.stringify(report, null, 2),
      title: "ЛОТ Alpha — сообщить об ошибке",
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar label={profile.email} size={56} />
        <View>
          <Text style={styles.title}>Профиль</Text>
          <Text style={styles.subtitle}>ID: {profile.email}</Text>
        </View>
      </View>

      <SectionHeader title="Режим" />
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Сейчас: {profile.mode === "seller" ? "Продавец" : "Покупатель"}</Text>
        {profile.sellerCapable ? (
          <SecondaryButton
            label={profile.mode === "buyer" ? "Переключить на продавца" : "Переключить на покупателя"}
            fullWidth
            onPress={() => {
              const next = profile.mode === "buyer" ? "seller" : "buyer";
              profile.onSwitchMode(next);
              router.replace(next === "seller" ? "/(tabs)/seller-home" : "/(tabs)");
            }}
          />
        ) : (
          <Text style={styles.hint}>Аккаунт покупателя — режим продавца недоступен.</Text>
        )}
      </View>

      <SectionHeader title="Настройки" />
      <Pressable style={styles.row} onPress={() => Linking.openURL(`${config.apiBaseUrl}/account/settings`)}>
        <Text style={styles.rowText}>Личные данные</Text>
        <Text style={styles.rowChevron}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={onReportError}>
        <Text style={styles.rowText}>Поддержка</Text>
        <Text style={styles.rowChevron}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => Linking.openURL(`${config.apiBaseUrl}/about`)}>
        <Text style={styles.rowText}>О приложении</Text>
        <Text style={styles.rowChevron}>›</Text>
      </Pressable>

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
      <Pressable style={styles.logout} onPress={() => void profile.onLogout().then(() => router.replace("/login"))}>
        <Text style={styles.logoutText}>Выйти</Text>
      </Pressable>

      <Text style={styles.version}>Версия {config.appVersion} ({config.buildNumber}) · {config.releaseChannel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  title: { ...typography.h1 },
  subtitle: { ...typography.caption, color: colors.gray500 },
  card: { backgroundColor: colors.gray100, borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  cardLabel: { ...typography.body, color: colors.gray900 },
  hint: { ...typography.caption, color: colors.gray500 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  rowText: { ...typography.body, color: colors.black },
  rowChevron: { ...typography.h2, color: colors.gray500 },
  updateBanner: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: spacing.md, gap: spacing.sm, backgroundColor: colors.gray100 },
  updateTitle: { ...typography.subtitle },
  logout: { backgroundColor: colors.black, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoutText: { color: colors.white, ...typography.subtitle },
  version: { ...typography.caption, color: colors.gray500, textAlign: "center", marginTop: "auto" },
});
