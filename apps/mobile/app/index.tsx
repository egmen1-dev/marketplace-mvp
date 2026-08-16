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
  const setUserRole = useAppStore((s) => s.setUserRole);
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
        if (meta?.role) setUserRole(meta.role);
        setBootstrapped(true);
        setReady(token && meta ? "app" : "login");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setBootstrapped, setRemoteConfig, setUserRole]);

  if (ready === "app") return <Redirect href="/(tabs)" />;
  if (ready === "login") return <Redirect href="/login" />;

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image source={require("../assets/splash-icon.png")} style={styles.logo} />
        <Text style={styles.title}>ЛОТ</Text>
        <Text style={styles.tagline}>Маркетплейс, которому доверяют</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.orange} size="large" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, padding: spacing.xl },
  brand: { alignItems: "center", gap: spacing.md, marginBottom: spacing.xxl },
  logo: { width: 96, height: 96 },
  title: { ...typography.display, color: colors.orange, fontSize: 36 },
  tagline: { ...typography.body, color: colors.gray500 },
  error: { color: colors.danger, textAlign: "center" },
});
