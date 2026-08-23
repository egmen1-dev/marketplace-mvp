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
import { buildErrorReport } from "../../src/telemetry/error-report";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function ProfileScreen() {
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const messagesBadge = useAppStore((s) => s.badges.messages);
  const [email, setEmail] = useState<string>("—");
  const buildInfo = getBuildInfo();

  useEffect(() => {
    getSessionMeta().then((meta) => {
      if (meta?.userId) setEmail(meta.userId.slice(0, 8) + "…");
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
        <Avatar label={email} size={56} />
        <View style={styles.identityText}>
          <Text style={styles.title}>Аккаунт</Text>
          <Text style={styles.subtitle}>ID: {email}</Text>
        </View>
      </View>

      <ProfileMenu
        sellerCapable={sellerCapable}
        messagesBadge={messagesBadge}
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
