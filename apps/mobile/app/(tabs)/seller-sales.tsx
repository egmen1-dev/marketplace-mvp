import { useEffect, useState } from "react";
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchSellerHome } from "../../src/api/endpoints";
import { EmptyState, MetricCard, PageScroll, SectionHeader, SkeletonGrid } from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useAppStore } from "../../src/store/app-store";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function SellerSalesScreen() {
  const fade = useFadeIn();
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [data, setData] = useState<{ needAction?: number; active?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetchSellerHome()
      .then((res) => setData({ needAction: res.orders?.needAction, active: res.products?.active }))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (sellerCapable) load();
    else setLoading(false);
  }, [sellerCapable]);

  if (!sellerCapable) {
    return (
      <PageScroll>
        <EmptyState
          title="Продажи недоступны"
          description="Подключите продавца в профиле, чтобы видеть заказы покупателей."
        />
      </PageScroll>
    );
  }

  if (loading) {
    return (
      <PageScroll>
        <SkeletonGrid count={2} />
      </PageScroll>
    );
  }

  return (
    <PageScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Animated.View style={{ opacity: fade, gap: spacing.lg, padding: spacing.lg }}>
        <SectionHeader title="Мои продажи" />
        <Text style={styles.lead}>Заказы покупателей и статус обработки продаж.</Text>
        <View style={styles.metrics}>
          <MetricCard label="Требуют внимания" value={String(data?.needAction ?? 0)} />
          <MetricCard label="Активные товары" value={String(data?.active ?? 0)} />
        </View>
        <Text style={styles.note}>
          Полный список заказов покупателей доступен в веб-кабинете продавца. Сводка обновляется при подключении к серверу.
        </Text>
      </Animated.View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  lead: { ...typography.body, color: colors.gray700 },
  metrics: { flexDirection: "row", gap: spacing.md },
  note: { ...typography.caption, color: colors.gray500 },
});
