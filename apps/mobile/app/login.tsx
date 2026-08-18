import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Linking } from "react-native";

import { login } from "../src/api/client";
import { postTelemetry } from "../src/api/endpoints";
import { loadAppConfig } from "../src/config/env";
import { routeDeepLink } from "../src/deep-links/route-deep-link";
import { LoginExperience } from "../src/features/auth/LoginExperience";
import { hapticError, hapticSuccess } from "../src/hooks/useHapticFeedback";
import { useAppStore } from "../src/store/app-store";

const SUCCESS_HOLD_MS = 450;

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
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.length >= 4 && !loading && !success,
    [email, password, loading, success],
  );

  function openWeb(path: string) {
    Linking.openURL(`${config.apiBaseUrl}${path}`);
  }

  async function onSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const pending = pendingDeepLink;
      const data = await login({ email: email.trim(), password, pendingDeepLink: pending ?? undefined });
      setUserRole(data.role ?? "BUYER");
      await postTelemetry({ screen: "login", event: "login_success" });
      setPendingDeepLink(null);
      setSuccess(true);
      hapticSuccess();
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_HOLD_MS));
      if (pending && routeDeepLink(pending)) return;
      router.replace("/(tabs)");
    } catch (err) {
      await postTelemetry({ screen: "login", event: "login_failed", errorCode: "LOGIN_FAILED" });
      hapticError();
      setError(err instanceof Error ? err.message : "Проверьте email и пароль и попробуйте снова");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginExperience
      email={email}
      password={password}
      showPassword={showPassword}
      error={error}
      loading={loading}
      success={success}
      canSubmit={canSubmit}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onTogglePassword={() => setShowPassword((v) => !v)}
      onSubmit={onSubmit}
      onClearError={() => setError(null)}
      onRegister={() => openWeb("/auth/sign-up")}
      onForgotPassword={() => openWeb("/auth/sign-in")}
    />
  );
}
