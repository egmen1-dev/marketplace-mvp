import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { fetchSellerHome } from "../../src/api/endpoints";
import {
  AppHeader,
  EmptyState,
  ErrorState,
  InfoCard,
  LoadingState,
  MetricCard,
  PageScroll,
  PrimaryButton,
  SecondaryButton,
  WalletCard,
} from "../../src/components/ui";
import { readSnapshot, saveSnapshot } from "../../src/storage/offline-cache";
import { formatPrice } from "../../src/utils/format";
import { useAppStore } from "../../src/store/app-store";
import { colors, spacing, typography } from "../../src/theme/tokens";

type SellerHomeData = {
  money?: { available: number; pending: number };
  orders?: { needAction: number };
  products?: { active: number; needAttention: number };
  promotion?: { active: number };
  intelligence?: { topAction: string | null; productId: string | null; confidence?: number; reason?: string };
};

export default function SellerHomeScreen() {
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [data, setData] = useState<SellerHomeData | null>(
    () => (readSnapshot<SellerHomeData>("seller-home")?.payload ?? null),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSellerHome();
      saveSnapshot("seller-home", res);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!sellerCapable) {
    return (
      <EmptyState
        title="Режим продавца недоступен"
        description="Этот аккаунт не является продавцом. Переключитесь в режим покупателя или войдите под seller@demo.lot."
        actionLabel="В профиль"
        onAction={() => router.push("/(tabs)/profile")}
      />
    );
  }

  if (loading && !data) return <LoadingState label="Загружаем кабинет…" />;

  const money = data?.money;
  const orders = data?.orders;
  const products = data?.products;
  const promotion = data?.promotion;
  const intelligence = data?.intelligence;

  return (
    <PageScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <AppHeader title="Кабинет продавца" subtitle="Сводка за сегодня" />

      {offline ? <Text style={styles.offline}>Оффлайн — показаны сохранённые данные</Text> : null}
      {error ? <ErrorState title="Ошибка" description={error} onRetry={load} /> : null}

      <WalletCard balance={money?.available ?? 0} withdrawable={money?.available ?? 0} pending={money?.pending ?? 0} />

      <View style={styles.metricsGrid}>
        <MetricCard label="Товаров" value={String(products?.active ?? 0)} hint="активных" tone="neutral" />
        <MetricCard label="Нужно внимания" value={String(products?.needAttention ?? 0)} tone={(products?.needAttention ?? 0) > 0 ? "warning" : "neutral"} />
        <MetricCard label="Заказы" value={String(orders?.needAction ?? 0)} hint="требуют действия" tone={(orders?.needAction ?? 0) > 0 ? "danger" : "success"} />
        <MetricCard label="Продвижение" value={String(promotion?.active ?? 0)} hint="активных кампаний" tone="neutral" />
      </View>

      {intelligence?.topAction ? (
        <InfoCard title="Главный AI совет" body={intelligence.topAction} />
      ) : (
        <InfoCard title="Совет дня" body="Проверьте остатки и обновите фото товаров — это повышает конверсию." />
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Быстрые действия</Text>
        <View style={styles.actions}>
          <PrimaryButton label="Мои товары" fullWidth onPress={() => router.push("/(tabs)/seller-products")} />
          <SecondaryButton label="Заказы" fullWidth onPress={() => router.push("/(tabs)/seller-sales")} />
          <SecondaryButton label="Кошелёк" fullWidth onPress={() => router.push("/(tabs)/wallet")} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Последние продажи</Text>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>История продаж скоро появится в мобильном кабинете.</Text>
          <Pressable onPress={() => router.push("/(tabs)/seller-sales")}>
            <Text style={styles.link}>Открыть заказы →</Text>
          </Pressable>
        </View>
      </View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  offline: { ...typography.caption, color: colors.gray500 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.h2, color: colors.black },
  actions: { gap: spacing.sm },
  placeholderCard: { backgroundColor: colors.gray100, borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  placeholderText: { ...typography.body, color: colors.gray700 },
  link: { ...typography.caption, color: colors.orange, fontWeight: "600" },
});
