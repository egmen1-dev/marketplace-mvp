import { router } from "expo-router";
import { Animated, RefreshControl, StyleSheet, Text, View } from "react-native";

import { MetricCard, WalletCard, InfoCard } from "../../design-system/cards/CommerceCards";
import { PrimaryButton, SecondaryButton } from "../../design-system/forms/buttons";
import { AppHeader, PageScroll, SectionHeader } from "../../design-system/layout/ScreenLayout";
import { EmptyState, ErrorState, SkeletonGrid } from "../../design-system/feedback/States";
import { useFadeIn } from "../../hooks/useFadeIn";
import { formatPrice } from "../../utils/format";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import type { SellerHomeDataState } from "./useSellerHomeData";

type Props = {
  state: SellerHomeDataState;
};

export function SellerHomeExperience({ state }: Props) {
  const fade = useFadeIn();
  const { offline, sellerCapable, data, loading, error, refresh } = state;

  if (!sellerCapable) {
    return (
      <EmptyState
        title="Режим продавца недоступен"
        description="Войдите под аккаунтом продавца, чтобы открыть кабинет."
        actionLabel="В профиль"
        onAction={() => router.push("/(tabs)/profile")}
      />
    );
  }

  if (loading && !data) {
    return (
      <PageScroll>
        <SkeletonGrid count={2} />
      </PageScroll>
    );
  }

  const money = data?.money;
  const orders = data?.orders;
  const products = data?.products;
  const promotion = data?.promotion;
  const intelligence = data?.intelligence;
  const todayTasks = [
    orders?.needAction ? `Обработать ${orders.needAction} заказ(ов)` : null,
    products?.needAttention ? `Проверить ${products.needAttention} товар(ов) с нулевым остатком` : null,
    promotion?.active === 0 ? "Запустить продвижение для роста продаж" : null,
  ].filter(Boolean) as string[];

  return (
    <PageScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}>
      <Animated.View style={{ opacity: fade, gap: spacing.lg }}>
        <AppHeader title="Сегодня" subtitle="Что важно сделать прямо сейчас" />

        {offline ? <Text style={styles.offline}>Оффлайн — показаны сохранённые данные</Text> : null}
        {error ? <ErrorState title="Ошибка" description={error} onRetry={() => void refresh()} /> : null}

        <View style={styles.todayCard}>
          {todayTasks.length > 0 ? (
            todayTasks.map((task) => (
              <Text key={task} style={styles.todayItem}>
                • {task}
              </Text>
            ))
          ) : (
            <Text style={styles.todayItem}>• Все задачи на сегодня выполнены</Text>
          )}
        </View>

        <SectionHeader title="Заказы" />
        <MetricCard
          label="Требуют действия"
          value={String(orders?.needAction ?? 0)}
          hint="оплатленные и в обработке"
          tone={(orders?.needAction ?? 0) > 0 ? "danger" : "success"}
        />

        <SectionHeader title="AI рекомендации" />
        {intelligence?.topAction ? (
          <InfoCard title="Главная рекомендация" body={intelligence.topAction} />
        ) : (
          <InfoCard title="Совет" body="Обновите фото и описания товаров — это повышает конверсию в мобильном каталоге." />
        )}

        <SectionHeader title="Продвижение" />
        <MetricCard label="Активные кампании" value={String(promotion?.active ?? 0)} tone="neutral" />

        <SectionHeader title="Продажи" />
        <View style={styles.metricsGrid}>
          <MetricCard label="Активные товары" value={String(products?.active ?? 0)} tone="neutral" />
          <MetricCard
            label="Нужно внимания"
            value={String(products?.needAttention ?? 0)}
            tone={(products?.needAttention ?? 0) > 0 ? "warning" : "neutral"}
          />
        </View>

        <SectionHeader title="Кошелёк" />
        <WalletCard balance={money?.available ?? 0} withdrawable={money?.available ?? 0} pending={money?.pending ?? 0} />
        {(money?.pending ?? 0) > 0 ? (
          <Text style={styles.pendingHint}>Ожидают выплаты: {formatPrice(money?.pending ?? 0)}</Text>
        ) : null}

        <SectionHeader title="Последние действия" />
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>Откройте заказы или товары, чтобы увидеть свежую активность.</Text>
        </View>

        <SectionHeader title="Быстрые действия" />
        <View style={styles.actions}>
          <PrimaryButton label="Мои товары" fullWidth onPress={() => router.push("/(tabs)/seller-products")} />
          <SecondaryButton label="Заказы" fullWidth onPress={() => router.push("/(tabs)/seller-sales")} />
          <SecondaryButton label="Кошелёк" fullWidth onPress={() => router.push("/(tabs)/wallet")} />
        </View>
      </Animated.View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  offline: { ...typography.caption, color: colors.gray500 },
  todayCard: { backgroundColor: colors.orangeSoft, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  todayItem: { ...typography.body, color: colors.gray900 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  pendingHint: { ...typography.caption, color: colors.gray700 },
  placeholderCard: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg },
  placeholderText: { ...typography.body, color: colors.gray700 },
  actions: { gap: spacing.sm },
});
