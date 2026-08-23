import { useEffect, useState } from "react";
import { Animated, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

import { fetchOrders, fetchSellerHome } from "../../src/api/endpoints";
import { Badge, EmptyState, PageContainer, SectionHeader, SkeletonGrid } from "../../src/components/ui";
import { formatBuyerOrderStatus } from "../../src/commerce/order-status";
import { refreshTabBadges } from "../../src/commerce/refresh-tab-badges";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

export default function OrdersScreen() {
  const fade = useFadeIn();
  const params = useLocalSearchParams<{ checkoutSuccess?: string }>();
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const checkoutSuccess = useAppStore((s) => s.checkoutSuccess);
  const clearCheckoutSuccess = useAppStore((s) => s.clearCheckoutSuccess);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [sellerSummary, setSellerSummary] = useState<{ needAction?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, sellerHome] = await Promise.all([
        fetchOrders(),
        sellerCapable ? fetchSellerHome().catch(() => null) : Promise.resolve(null),
      ]);
      setItems(orders.items);
      setSellerSummary(sellerHome?.orders ?? null);
      await refreshTabBadges();
    } finally {
      setLoading(false);
    }
  }, [sellerCapable]);

  useEffect(() => {
    void load();
  }, [sellerCapable, load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (params.checkoutSuccess !== "1" && !checkoutSuccess) return;
    void load();
  }, [params.checkoutSuccess, checkoutSuccess, load]);

  if (loading && items.length === 0) {
    return (
      <PageContainer style={styles.container}>
        <SkeletonGrid count={2} />
      </PageContainer>
    );
  }

  const successOrder = checkoutSuccess;

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, flex: 1 }}>
        <SectionHeader title="Мои покупки" />

        {successOrder ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Заказ оформлен</Text>
            <Text style={styles.successNumber}>№{successOrder.orderNumber}</Text>
            <Text style={styles.successBody}>Продавец получил информацию.</Text>
            <Text style={styles.successStatus}>
              Статус: {successOrder.statusLabel}
            </Text>
            <Pressable
              onPress={() => {
                clearCheckoutSuccess();
                router.push(`/order/${successOrder.orderId}`);
              }}
            >
              <Text style={styles.successLink}>Открыть заказ →</Text>
            </Pressable>
          </View>
        ) : null}

        {sellerCapable && sellerSummary?.needAction ? (
          <Text style={styles.sellerHint}>
            У вас {sellerSummary.needAction} продаж требуют внимания — откройте «Продать → Заказы».
          </Text>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              preset="orders"
              title="Покупок пока нет"
              description="Найдите товар в каталоге и оформите первую покупку."
              actionLabel="В каталог"
              onAction={() => router.push("/(tabs)/catalog")}
            />
          }
          renderItem={({ item }) => {
            const status = String(item.status ?? "NEW");
            const tone =
              formatBuyerOrderStatus(status) === "Ожидает подтверждения"
                ? "warning"
                : "neutral";
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/order/${String(item.id)}`)}
                accessibilityRole="button"
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>Заказ №{String(item.orderNumber ?? item.id ?? "—")}</Text>
                  <Badge label={formatBuyerOrderStatus(status)} tone={tone} />
                </View>
                <Text style={styles.caption}>{formatOrderMeta(item)}</Text>
                <Text style={styles.link}>Открыть статус заказа →</Text>
              </Pressable>
            );
          }}
        />
      </Animated.View>
    </PageContainer>
  );
}

function formatOrderMeta(item: Record<string, unknown>): string {
  const total = item.totalAmount ?? item.total;
  if (typeof total === "number") return `Сумма: ${total.toLocaleString("ru-RU")} ₽`;
  return "Нажмите, чтобы увидеть детали";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  successCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.orangeSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  successTitle: { ...typography.subtitle, color: colors.black },
  successNumber: { ...typography.h2, color: colors.black },
  successBody: { ...typography.body, color: colors.gray700 },
  successStatus: { ...typography.body, color: colors.gray900, fontWeight: "600" },
  successLink: { ...typography.caption, color: colors.orange, fontWeight: "600", marginTop: spacing.xs },
  sellerHint: { ...typography.caption, color: colors.gray700, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typography.subtitle, color: colors.black },
  caption: { ...typography.caption, color: colors.gray500 },
  link: { ...typography.caption, color: colors.orange, fontWeight: "600" },
});
