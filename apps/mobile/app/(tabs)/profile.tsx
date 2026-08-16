import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

import { logout } from "../../src/api/client";
import { postTelemetry } from "../../src/api/endpoints";
import { loadAppConfig } from "../../src/config/env";
import { getSessionMeta } from "../../src/storage/secure-session";
import { useAppStore } from "../../src/store/app-store";
import { buildErrorReport } from "../../src/telemetry/error-report";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function ProfileScreen() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const [role, setRole] = useState<string>("—");
  const config = loadAppConfig();

  useEffect(() => {
    getSessionMeta().then((meta) => setRole(meta?.role ?? "—"));
  }, []);

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
  switch: { backgroundColor: colors.gray100, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  switchText: { ...typography.subtitle },
  report: { borderWidth: 1, borderColor: colors.gray200, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reportText: { ...typography.subtitle, color: colors.gray900 },
  logout: { backgroundColor: colors.black, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoutText: { color: colors.white, ...typography.subtitle },
});
