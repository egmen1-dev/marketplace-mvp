import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { logout } from "../../src/api/client";
import { fetchMobileUpdate, postTelemetry, submitProductFeedback } from "../../src/api/endpoints";
import { getBuildInfo } from "../../src/beta/build-info";
import { loadAppConfig } from "../../src/config/env";
import { Avatar, GhostButton, PrimaryButton, SectionHeader } from "../../src/components/ui";
import { getSessionMeta } from "../../src/storage/secure-session";
import { useAppStore } from "../../src/store/app-store";
import { buildErrorReport } from "../../src/telemetry/error-report";
import { startApkDownload } from "../../src/update/download-apk";
import { UPDATE_ANALYTICS } from "../../src/update/types";
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
      title: "ЛОТ Alpha — сообщить об ошибке",
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar label={email} size={56} />
        <View>
          <Text style={styles.title}>Профиль</Text>
          <Text style={styles.subtitle}>ID: {email}</Text>
        </View>
      </View>

      <SectionHeader title="Покупки" />
      <Pressable style={styles.row} onPress={() => router.push("/(tabs)/orders")}>
        <Text style={styles.rowText}>Мои заказы</Text>
        <Text style={styles.rowChevron}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push("/(tabs)/favorites")}>
        <Text style={styles.rowText}>Избранное</Text>
        <Text style={styles.rowChevron}>›</Text>
      </Pressable>

      {sellerCapable ? (
        <>
          <SectionHeader title="Продажи" />
          <Pressable style={styles.row} onPress={() => router.push("/(tabs)/seller-home")}>
            <Text style={styles.rowText}>Панель продавца</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push("/(tabs)/seller-products")}>
            <Text style={styles.rowText}>Мои товары</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push("/(tabs)/seller-sales")}>
            <Text style={styles.rowText}>Мои продажи</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push("/(tabs)/wallet")}>
            <Text style={styles.rowText}>Кошелёк и финансы</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        </>
      ) : null}

      <SectionHeader title="Настройки" />
      <Pressable style={styles.row} onPress={() => Linking.openURL(`${config.apiBaseUrl}/account/settings`)}>
        <Text style={styles.rowText}>Личные данные</Text>
        <Text style={styles.rowChevron}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push("/feedback")}>
        <Text style={styles.rowText}>Центр обратной связи</Text>
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
      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Выйти</Text>
      </Pressable>

      <Text style={styles.version}>
        Версия {buildInfo.appVersion} ({buildInfo.buildNumber}) · {buildInfo.releaseChannel}
        {"\n"}Канал: {buildInfo.channel} · API: {buildInfo.apiBaseUrl}
        {"\n"}Commit: {buildInfo.commitSha} · Сборка: {buildInfo.buildTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  title: { ...typography.h1 },
  subtitle: { ...typography.caption, color: colors.gray500 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  rowText: { ...typography.body, color: colors.black },
  rowChevron: { ...typography.h2, color: colors.gray500 },
  updateBanner: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: spacing.md, gap: spacing.sm, backgroundColor: colors.gray100 },
  updateTitle: { ...typography.subtitle },
  logout: { backgroundColor: colors.black, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoutText: { color: colors.white, ...typography.subtitle },
  version: { ...typography.caption, color: colors.gray500, textAlign: "center", marginTop: "auto" },
});
