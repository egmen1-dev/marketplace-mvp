import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { logout } from "../../src/api/client";
import { fetchMobileUpdate, postTelemetry, submitProductFeedback } from "../../src/api/endpoints";
import { getBuildInfo } from "../../src/beta/build-info";
import { Avatar, GhostButton, PrimaryButton } from "../../src/components/ui";
import { ProfileMenu } from "../../src/components/ProfileMenu";
import { getSessionMeta } from "../../src/storage/secure-session";
import { useAppStore } from "../../src/store/app-store";
import { buildErrorReport } from "../../src/telemetry/error-report";
import { getUpdateErrorMessage, startApkDownload } from "../../src/update/download-apk";
import { UPDATE_UI_LABELS } from "../../src/update/update-ui-labels";
import { UPDATE_ANALYTICS } from "../../src/update/types";
import { isUpdateEligibleForInstall } from "../../src/utils/update-eligibility";
import { colors, spacing, typography } from "../../src/theme/tokens";
import type { MobileUpdateInfo } from "../../src/api/endpoints";

type UpdatePhase = "idle" | "checking" | "available" | "handoff" | "up_to_date" | "failed";

export default function ProfileScreen() {
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [email, setEmail] = useState<string>("—");
  const [updateInfo, setUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>("idle");
  const [updateError, setUpdateError] = useState<string | null>(null);
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

  const hasUpdate = isUpdateEligibleForInstall(updateInfo, buildInfo.buildNumber);

  async function checkForUpdate() {
    setUpdatePhase("checking");
    setUpdateError(null);
    try {
      const info = await fetchMobileUpdate();
      setUpdateInfo(info);
      if (isUpdateEligibleForInstall(info, buildInfo.buildNumber)) {
        setUpdatePhase("available");
      } else {
        setUpdatePhase("up_to_date");
      }
    } catch {
      setUpdatePhase("failed");
      setUpdateError(UPDATE_UI_LABELS.installFailed);
    }
  }

  async function onInstallUpdate() {
    if (!updateInfo) return;
    setUpdatePhase("handoff");
    setUpdateError(null);
    await postTelemetry({ screen: "profile", event: UPDATE_ANALYTICS.started, errorCode: updateInfo.versionName });
    const result = await startApkDownload(updateInfo);
    if (!result.ok) {
      setUpdatePhase("failed");
      setUpdateError(getUpdateErrorMessage(result.code));
    }
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

  function updateStatusText(): string | null {
    if (updatePhase === "checking") return UPDATE_UI_LABELS.checking;
    if (updatePhase === "available" && updateInfo) return `${UPDATE_UI_LABELS.available}: ${updateInfo.versionName}`;
    if (updatePhase === "handoff") return UPDATE_UI_LABELS.installerOpened;
    if (updatePhase === "up_to_date") return UPDATE_UI_LABELS.upToDate;
    if (updatePhase === "failed") return updateError ?? UPDATE_UI_LABELS.installFailed;
    if (hasUpdate && updateInfo) return `${UPDATE_UI_LABELS.available}: ${updateInfo.versionName}`;
    return null;
  }

  const statusText = updateStatusText();

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
        onSupport={onReportError}
        onReportError={onReportError}
        onAbout={() => router.push("/about")}
        onCheckUpdate={checkForUpdate}
        footer={
          <>
            {statusText ? (
              <View style={styles.updateBanner}>
                <Text style={styles.updateTitle}>{statusText}</Text>
                {updatePhase === "handoff" ? (
                  <Text style={styles.updateHint}>{UPDATE_UI_LABELS.browserHandoff}</Text>
                ) : null}
                {(hasUpdate || updatePhase === "available") && updateInfo ? (
                  <PrimaryButton label={UPDATE_UI_LABELS.install} onPress={onInstallUpdate} size="sm" />
                ) : null}
              </View>
            ) : null}

            <Pressable style={styles.logout} onPress={onLogout} accessibilityRole="button" accessibilityLabel="Выйти">
              <Text style={styles.logoutText}>Выйти</Text>
            </Pressable>

            <Text style={styles.version}>
              {buildInfo.appVersion} ({buildInfo.buildNumber}) · {buildInfo.channel}
              {"\n"}SHA {buildInfo.commitSha.slice(0, 7)} · {buildInfo.environment}
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
  updateHint: { ...typography.caption, color: colors.gray700 },
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
