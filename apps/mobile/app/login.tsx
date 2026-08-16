import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { login } from "../src/api/client";
import { postTelemetry } from "../src/api/endpoints";
import { routeDeepLink } from "../src/deep-links/route-deep-link";
import { useAppStore } from "../src/store/app-store";
import { colors, spacing, typography } from "../src/theme/tokens";

export default function LoginScreen() {
  const pendingDeepLink = useAppStore((s) => s.pendingDeepLink);
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const pending = pendingDeepLink;
      await login({ email, password, pendingDeepLink: pending ?? undefined });
      await postTelemetry({ screen: "login", event: "login_success" });
      setPendingDeepLink(null);
      if (pending && routeDeepLink(pending)) return;
      router.replace("/(tabs)");
    } catch (err) {
      await postTelemetry({ screen: "login", event: "login_failed", errorCode: "LOGIN_FAILED" });
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход в ЛОТ</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <View style={styles.passwordRow}>
        <TextInput
          secureTextEntry={!showPassword}
          placeholder="Пароль"
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable accessibilityLabel="Показать пароль" onPress={() => setShowPassword((v) => !v)} style={styles.eye}>
          <Text>{showPassword ? "🙈" : "👁"}</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "…" : "Войти"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.white, gap: spacing.md },
  title: { ...typography.title, color: colors.black },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 48,
    backgroundColor: colors.white,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eye: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  button: { backgroundColor: colors.orange, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  buttonText: { color: colors.white, ...typography.subtitle },
  error: { color: colors.danger },
});
