import { Linking } from "react-native";

import { loadAppConfig } from "../src/config/env";
import { LoginExperience } from "../src/features/auth/LoginExperience";
import { useAuth } from "../src/features/auth/useAuth";

export default function LoginScreen() {
  const config = loadAppConfig();
  const auth = useAuth();

  function openWeb(path: string) {
    Linking.openURL(`${config.apiBaseUrl}${path}`);
  }

  return (
    <LoginExperience
      email={auth.email}
      password={auth.password}
      showPassword={auth.showPassword}
      error={auth.error}
      loading={auth.loading}
      success={auth.success}
      canSubmit={auth.canSubmit}
      onEmailChange={auth.setEmail}
      onPasswordChange={auth.setPassword}
      onTogglePassword={auth.togglePassword}
      onSubmit={() => void auth.submit()}
      onClearError={auth.clearError}
      onRegister={() => openWeb("/auth/sign-up")}
      onForgotPassword={() => openWeb("/auth/sign-in")}
    />
  );
}
