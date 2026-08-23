import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { fetchOrder } from "../../src/api/endpoints";
import { ErrorState, PageScroll, SecondaryButton, SectionHeader, SkeletonGrid } from "../../src/components/ui";
import { buildBuyerOrderTimeline, formatBuyerOrderStatus } from "../../src/commerce/order-status";
import { refreshTabBadges } from "../../src/commerce/refresh-tab-badges";
import { openProductConversation } from "../../src/hooks/useChatActions";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";
import { formatPrice } from "../../src/utils/format";

type OrderItem = {
  productId?: string;
  productName?: string;
  quantity?: number;
  totalPrice?: number;
  product?: { images?: Array<{ url: string }> };
};

export default function OrderDetailScreen() {
  const { id, checkoutSuccess } = useLocalSearchParams<{ id: string; checkoutSuccess?: string }>();
  const setCheckoutSuccess = useAppStore((s) => s.setCheckoutSuccess);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrder(id);
      setOrder(data);
      await refreshTabBadges();
      if (checkoutSuccess === "1") {
        setCheckoutSuccess({
          orderId: String(data.id ?? id),
          orderNumber: String(data.orderNumber ?? id),
          statusLabel: formatBuyerOrderStatus(String(data.status ?? "NEW")),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить заказ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id, checkoutSuccess]);

  if (loading) {
    return (
      <PageScroll>
        <SkeletonGrid count={2} />
      </PageScroll>
    );
  }

  if (error || !order) {
    return (
      <PageScroll>
        <ErrorState title="Заказ недоступен" description={error ?? "Не найден"} onRetry={() => void load()} />
      </PageScroll>
    );
  }

  const items = (order.items as OrderItem[] | undefined) ?? [];
  const primary = items[0];
  const status = String(order.status ?? "NEW");
  const timeline = buildBuyerOrderTimeline(status);
  const total = typeof order.total === "number" ? order.total : 0;
  const showSuccess = checkoutSuccess === "1";

  async function onWriteSeller() {
    const productId = items.find((item) => item.productId)?.productId;
    if (productId) await openProductConversation(productId);
  }

  return (
    <PageScroll>
      <View style={styles.container}>
        <SectionHeader title={`Заказ №${String(order.orderNumber ?? order.id)}`} />

        {showSuccess ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Заказ оформлен</Text>
            <Text style={styles.successBody}>Продавец получил информацию.</Text>
            <Text style={styles.successStatus}>Статус: {formatBuyerOrderStatus(status)}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Товар</Text>
          {primary?.product?.images?.[0]?.url ? (
            <Image source={{ uri: primary.product.images[0].url }} style={styles.image} resizeMode="cover" />
          ) : null}
          <Text style={styles.productTitle}>{primary?.productName ?? "Товар"}</Text>
          {primary?.quantity ? <Text style={styles.meta}>Количество: {primary.quantity}</Text> : null}
          <Text style={styles.amount}>{formatPrice(total)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Статус</Text>
          <Text style={styles.statusHeadline}>{formatBuyerOrderStatus(status)}</Text>
          {timeline.map((step) => (
            <View key={step.key} style={styles.timelineRow}>
              <Text style={styles.timelineMarker}>
                {step.marker === "done" ? "✓" : step.marker === "current" ? "●" : "○"}
              </Text>
              <Text
                style={[
                  styles.timelineLabel,
                  step.marker === "current" && styles.timelineCurrent,
                  step.marker === "todo" && styles.timelineMuted,
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        <SecondaryButton label="Написать продавцу" fullWidth onPress={() => void onWriteSeller()} />
      </View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  successCard: {
    backgroundColor: colors.orangeSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  successTitle: { ...typography.subtitle, color: colors.black },
  successBody: { ...typography.body, color: colors.gray700 },
  successStatus: { ...typography.body, color: colors.gray900, fontWeight: "600" },
  card: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  sectionLabel: { ...typography.caption, color: colors.gray500, textTransform: "uppercase" },
  statusHeadline: { ...typography.subtitle, color: colors.black },
  image: { width: "100%", height: 160, borderRadius: radii.md, backgroundColor: colors.gray200 },
  productTitle: { ...typography.subtitle, color: colors.black },
  meta: { ...typography.body, color: colors.gray700 },
  amount: { ...typography.h2, color: colors.black },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  timelineMarker: { width: 20, fontSize: 16, textAlign: "center", color: colors.orange },
  timelineLabel: { ...typography.body, color: colors.gray700 },
  timelineCurrent: { color: colors.black, fontWeight: "700" },
  timelineMuted: { opacity: 0.4 },
});
