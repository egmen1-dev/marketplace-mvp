import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { fetchBootstrap, fetchRemoteConfig, postTelemetry } from "../src/api/endpoints";
import { getAccessToken, getSessionMeta } from "../src/storage/secure-session";
import { useAppStore } from "../src/store/app-store";
import { colors, spacing, typography } from "../src/theme/tokens";

export default function BootScreen() {
  const setBootstrapped = useAppStore((s) => s.setBootstrapped);
  const setRemoteConfig = useAppStore((s) => s.setRemoteConfig);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<"login" | "app" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchBootstrap();
        const remote = await fetchRemoteConfig().catch(() => null);
        await postTelemetry({ screen: "boot", event: "session_start" });
        const token = await getAccessToken();
        const meta = await getSessionMeta();
        if (cancelled) return;
        if (remote?.config) setRemoteConfig(remote.config);
        setBootstrapped(true);
        setReady(token && meta ? "app" : "login");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setBootstrapped, setRemoteConfig]);

  if (ready === "app") return <Redirect href="/(tabs)" />;
  if (ready === "login") return <Redirect href="/login" />;

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ЛОТ</Text>
      {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.orange} size="large" />}
      <Text style={styles.caption}>Загрузка…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, padding: spacing.lg },
  logo: { ...typography.title, color: colors.orange, fontSize: 36, marginBottom: spacing.lg },
  caption: { ...typography.caption, color: colors.gray500, marginTop: spacing.md },
  error: { color: colors.danger, textAlign: "center", marginBottom: spacing.sm },
});
