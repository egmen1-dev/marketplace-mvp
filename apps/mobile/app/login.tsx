import { router } from "expo-router";
import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { login } from "../src/api/client";
import { postTelemetry } from "../src/api/endpoints";
import { loadAppConfig } from "../src/config/env";
import { resolvePostAuthHref } from "../src/deep-links/resolve-post-auth-href";
import { GhostButton, PrimaryButton } from "../src/components/ui";
import { useAppStore } from "../src/store/app-store";
import { colors, layout, radii, spacing, typography } from "../src/theme/tokens";

export default function LoginScreen() {
  const pendingDeepLink = useAppStore((s) => s.pendingDeepLink);
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const config = loadAppConfig();
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
      const data = await login({ email, password, pendingDeepLink: pending ?? undefined });
      const role = data.role ?? "BUYER";
      setUserRole(role);
      await postTelemetry({ screen: "login", event: "login_success" });
      setPendingDeepLink(null);
      router.replace(
        resolvePostAuthHref({
          role,
          pendingDeepLink: pending,
          destination: data.destination as { webPath?: string } | null | undefined,
        }),
      );
    } catch (err) {
      await postTelemetry({ screen: "login", event: "login_failed", errorCode: "LOGIN_FAILED" });
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  function openWeb(path: string) {
    Linking.openURL(`${config.apiBaseUrl}${path}`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}>
        <Image source={require("../assets/splash-icon.png")} style={styles.logo} />
        <Text style={styles.brandTitle}>ЛОТ</Text>
        <Text style={styles.brandSubtitle}>Покупайте выгодно. Продавайте быстро.</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          testID="login-email"
          accessibilityLabel="login-email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.gray500}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <View style={styles.passwordRow}>
          <TextInput
            testID="login-password"
            accessibilityLabel="login-password"
            secureTextEntry={!showPassword}
            placeholder="Пароль"
            placeholderTextColor={colors.gray500}
            value={password}
            onChangeText={setPassword}
            style={[styles.input, styles.passwordInput]}
          />
          <Pressable
            accessibilityLabel="Показать пароль"
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eye}
          >
            <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.gray500} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton testID="login-submit" label="Войти" onPress={onSubmit} loading={loading} fullWidth size="md" />

        <View style={styles.links}>
          <GhostButton label="Создать аккаунт" onPress={() => openWeb("/auth/sign-up")} />
          <GhostButton label="Забыли пароль?" onPress={() => openWeb("/auth/sign-in")} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.white, justifyContent: "center", gap: spacing.xxl },
  brandBlock: { alignItems: "center", gap: spacing.sm },
  logo: { width: 72, height: 72, borderRadius: radii.lg },
  brandTitle: { ...typography.display, color: colors.orange },
  brandSubtitle: { ...typography.body, color: colors.gray500, textAlign: "center" },
  form: { gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    minHeight: layout.inputHeight,
    backgroundColor: colors.white,
    ...typography.body,
    color: colors.black,
  },
  passwordRow: { position: "relative" },
  passwordInput: { paddingRight: 48 },
  eye: { position: "absolute", right: spacing.sm, top: 0, bottom: 0, width: 40, alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, ...typography.caption },
  links: { flexDirection: "row", justifyContent: "space-between" },
});
