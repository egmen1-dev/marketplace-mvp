import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import { routeDeepLink } from "../../deep-links/route-deep-link";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { getCommerceUseCases } from "../../composition/commerce-container";
import { hapticError, hapticSuccess } from "../../hooks/useHapticFeedback";
import { useAppStore } from "../../store/app-store";

const SUCCESS_HOLD_MS = 450;

export function useAuth() {
  const commerce = getCommerceUseCases();
  const pendingDeepLink = useAppStore((s) => s.pendingDeepLink);
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);
  const setUserRole = useAppStore((s) => s.setUserRole);

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

  const clearError = useCallback(() => setError(null), []);
  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    const pending = pendingDeepLink;
    const result = await commerce.loginUser.execute({
      email: email.trim(),
      password,
      pendingDeepLink: pending ?? undefined,
    });

    if (!result.ok) {
      commerce.trackScreenEvent({ screen: "login", event: "login_failed", errorCode: "LOGIN_FAILED" });
      hapticError();
      setError(domainErrorMessage(result.error));
      setLoading(false);
      return;
    }

    setUserRole(result.value.role ?? "BUYER");
    commerce.trackScreenEvent({ screen: "login", event: "login_success" });
    setPendingDeepLink(null);
    setSuccess(true);
    hapticSuccess();
    await new Promise((resolve) => setTimeout(resolve, SUCCESS_HOLD_MS));

    if (pending && routeDeepLink(pending)) {
      setLoading(false);
      return;
    }
    router.replace("/(tabs)");
    setLoading(false);
  }, [
    canSubmit,
    commerce.loginUser,
    commerce.trackScreenEvent,
    email,
    password,
    pendingDeepLink,
    setPendingDeepLink,
    setUserRole,
  ]);

  return {
    email,
    password,
    showPassword,
    error,
    loading,
    success,
    canSubmit,
    setEmail,
    setPassword,
    togglePassword,
    clearError,
    submit,
  };
}

export type AuthState = ReturnType<typeof useAuth>;
