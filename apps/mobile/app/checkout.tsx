import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { fetchCheckoutWebUrl } from "../src/api/endpoints";
import { PrimaryButton, SecondaryButton } from "../src/components/ui";
import { trackButtonPress } from "../src/beta/session-recorder";
import { trackEvent } from "../src/beta/telemetry-hub";
import { colors, spacing, typography } from "../src/theme/tokens";

type CheckoutWebPayload = {
  strategy: string;
  handoffUrl: string;
  returnDeepLink: string;
  checkoutUrl: string;
};

export default function CheckoutScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CheckoutWebPayload | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchCheckoutWebUrl();
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подготовить оплату");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onOpenWebCheckout() {
    if (!payload?.handoffUrl) return;
    setLoading(true);
    trackButtonPress("checkout", "open_web_checkout");
    void trackEvent("checkout", "checkout_web_redirect_started", { strategy: payload.strategy });
    try {
      await Linking.openURL(payload.handoffUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть браузер");
    } finally {
      setLoading(false);
    }
  }

  function onReturnToOrders() {
    router.replace("/(tabs)/orders");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Оформление заказа</Text>
      <Text style={styles.body}>
        Закрытая бета использует безопасную веб-оплату (Mode A — Web Checkout Redirect). Нативная оплата не
        имитируется.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {payload ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Стратегия: {payload.strategy}</Text>
          <Text style={styles.hint}>
            После оплаты в браузере вернитесь в приложение. Заказы обновятся автоматически при следующем открытии.
          </Text>
          <PrimaryButton
            label={loading ? "Открываем…" : "Перейти к оплате в браузере"}
            onPress={onOpenWebCheckout}
            fullWidth
          />
          <SecondaryButton label="Мои заказы" onPress={onReturnToOrders} fullWidth />
          <Pressable onPress={() => Linking.openURL(payload.checkoutUrl)}>
            <Text style={styles.link}>Открыть checkout на сайте</Text>
          </Pressable>
        </View>
      ) : (
        <ActivityIndicator color={colors.orange} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.title },
  body: { ...typography.body, color: colors.gray900 },
  card: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.gray100,
  },
  cardTitle: { ...typography.subtitle },
  hint: { ...typography.caption, color: colors.gray500 },
  error: { color: "#c0392b", ...typography.body },
  link: { ...typography.caption, color: colors.orange, textAlign: "center" },
});
