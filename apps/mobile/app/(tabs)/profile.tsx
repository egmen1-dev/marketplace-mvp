import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { logout } from "../../src/api/client";
import { postTelemetry, submitProductFeedback } from "../../src/api/endpoints";
import { getBuildInfo } from "../../src/beta/build-info";
import { Avatar } from "../../src/components/ui";
import { ProfileMenu } from "../../src/components/ProfileMenu";
import { getSessionMeta } from "../../src/storage/secure-session";
import { openSupportPage } from "../../src/navigation/legal-links";
import { useAppStore } from "../../src/store/app-store";
import { useUpdateAvailabilityBadge } from "../../src/update/use-update-availability-badge";
import { buildErrorReport } from "../../src/telemetry/error-report";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function ProfileScreen() {
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const messagesBadge = useAppStore((s) => s.badges.messages);
  const { updateAvailable } = useUpdateAvailabilityBadge();
  const [email, setEmail] = useState<string | null>(null);
  const buildInfo = getBuildInfo();

  useEffect(() => {
    getSessionMeta().then((meta) => {
      const normalized = meta?.email?.trim();
      setEmail(normalized && normalized.length > 0 ? normalized : null);
    });
  }, []);

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
        <Avatar label={email ?? "А"} size={56} />
        <View style={styles.identityText}>
          <Text style={styles.title}>Аккаунт</Text>
          <Text style={styles.subtitle}>{email ?? "Войдите, чтобы видеть данные аккаунта"}</Text>
        </View>
      </View>

      <ProfileMenu
        sellerCapable={sellerCapable}
        messagesBadge={messagesBadge}
        updateAvailableVersion={updateAvailable?.versionName ?? null}
        onSupport={openSupportPage}
        onReportError={onReportError}
        onAbout={() => router.push("/about")}
        footer={
          <>
            <Pressable style={styles.logout} onPress={onLogout} accessibilityRole="button" accessibilityLabel="Выйти">
              <Text style={styles.logoutText}>Выйти</Text>
            </Pressable>

            <Text style={styles.version}>
              {buildInfo.appVersion} ({buildInfo.buildNumber}) · {buildInfo.channel}
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
