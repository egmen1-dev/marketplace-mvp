import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthErrorCard } from "../../design-system/components/AuthErrorCard";
import { IconButton } from "../../design-system/components/IconButton";
import { PrimaryCTA } from "../../design-system/components/PrimaryCTA";
import { TextField } from "../../design-system/components/TextField";
import { TrustPill } from "../../design-system/components/TrustPill";
import { brand, surface, text } from "../../design-system/tokens/colors";
import { shadows } from "../../design-system/tokens/elevation";
import { layout } from "../../design-system/tokens/layout";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { useStaggerFadeIn } from "../../hooks/useStaggerFadeIn";

export type LoginExperienceProps = {
  email: string;
  password: string;
  showPassword: boolean;
  error: string | null;
  loading: boolean;
  success: boolean;
  canSubmit: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
  onClearError: () => void;
  onRegister: () => void;
  onForgotPassword: () => void;
};

export function LoginExperience({
  email,
  password,
  showPassword,
  error,
  loading,
  success,
  canSubmit,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onClearError,
  onRegister,
  onForgotPassword,
}: LoginExperienceProps) {
  const insets = useSafeAreaInsets();
  const fades = useStaggerFadeIn(4, 60, 90);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, { opacity: fades[0] }]}>
          <View style={styles.logoFrame}>
            <Image source={require("../../assets/splash-icon.png")} style={styles.logo} accessibilityLabel="ЛОТ" />
          </View>
          <Text style={styles.title}>ЛОТ</Text>
          <Text style={styles.subtitle}>Маркетплейс, где покупают и продают каждый день</Text>
          <View style={styles.trustRow}>
            <TrustPill label="Покупки" />
            <TrustPill label="Продажи" />
            <TrustPill label="Безопасно" />
          </View>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fades[1] }]}>
          <Text style={styles.cardTitle}>Вход в аккаунт</Text>
          <Text style={styles.cardHint}>Используйте email и пароль от ЛОТ</Text>

          <TextField
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="name@example.com"
            value={email}
            onChangeText={(v: string) => {
              if (error) onClearError();
              onEmailChange(v);
            }}
            editable={!loading && !success}
          />

          <TextField
            label="Пароль"
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            placeholder="Введите пароль"
            value={password}
            onChangeText={(v: string) => {
              if (error) onClearError();
              onPasswordChange(v);
            }}
            editable={!loading && !success}
            rightAccessory={
              <IconButton
                accessibilityLabel={showPassword ? "Скрыть пароль" : "Показать пароль"}
                onPress={onTogglePassword}
                variant="muted"
              >
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={text.muted}
                />
              </IconButton>
            }
          />

          {error ? (
            <AuthErrorCard message={error} onRetry={onSubmit} />
          ) : null}

          <PrimaryCTA
            label="Войти"
            fullWidth
            loading={loading}
            success={success}
            disabled={!canSubmit}
            onPress={onSubmit}
          />
        </Animated.View>

        <Animated.View style={[styles.secondary, { opacity: fades[2] }]}>
          <View style={styles.linkRow}>
            <Pressable accessibilityRole="link" onPress={onRegister} hitSlop={8}>
              <Text style={styles.link}>Создать аккаунт</Text>
            </Pressable>
            <Text style={styles.linkDivider}>·</Text>
            <Pressable accessibilityRole="link" onPress={onForgotPassword} hitSlop={8}>
              <Text style={styles.linkMuted}>Забыли пароль?</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fades[3] }]}>
          <MaterialCommunityIcons name="shield-check-outline" size={16} color={text.muted} />
          <Text style={styles.footerText}>Closed Alpha · защищённое соединение · данные не передаются третьим лицам</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.primarySoft },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.pagePadding,
    gap: spacing["2xl"],
    justifyContent: "center",
  },
  hero: { alignItems: "center", gap: spacing.md, paddingTop: spacing.lg },
  logoFrame: {
    width: 88,
    height: 88,
    borderRadius: radii["2xl"],
    backgroundColor: surface.background,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.elevated,
  },
  logo: { width: 64, height: 64, borderRadius: radii.lg },
  title: { ...typography.display, color: brand.primary, letterSpacing: 1 },
  subtitle: { ...typography.body, color: text.secondary, textAlign: "center", maxWidth: 300 },
  trustRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  card: {
    backgroundColor: surface.background,
    borderRadius: radii["2xl"],
    padding: spacing["2xl"],
    gap: spacing.lg,
    ...shadows.sheet,
  },
  cardTitle: { ...typography.h1, color: text.primary },
  cardHint: { ...typography.bodySmall, color: text.muted, marginTop: -spacing.sm },
  secondary: { alignItems: "center" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  link: { ...typography.bodySmall, color: brand.primary, fontWeight: "600" },
  linkMuted: { ...typography.bodySmall, color: text.muted, fontWeight: "500" },
  linkDivider: { ...typography.bodySmall, color: text.muted },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  footerText: { ...typography.caption, color: text.muted, flex: 1, lineHeight: 18 },
});
