import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { fetchOrder } from "../../src/api/endpoints";
import { EmptyState, ErrorState, PageScroll, SecondaryButton, SectionHeader, SkeletonGrid } from "../../src/components/ui";
import { buildBuyerOrderTimeline } from "../../src/commerce/order-status";
import { openProductConversation } from "../../src/hooks/useChatActions";
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
  const { id } = useLocalSearchParams<{ id: string }>();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить заказ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

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

  async function onWriteSeller() {
    const productId = items.find((item) => item.productId)?.productId;
    if (productId) await openProductConversation(productId);
  }

  return (
    <PageScroll>
      <View style={styles.container}>
        <SectionHeader title={`Заказ №${String(order.orderNumber ?? order.id)}`} />

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
          {timeline.map((step) => (
            <View key={step.key} style={styles.timelineRow}>
              <Text style={[styles.timelineEmoji, !step.reached && styles.timelineMuted]}>{step.emoji}</Text>
              <Text
                style={[
                  styles.timelineLabel,
                  step.current && styles.timelineCurrent,
                  !step.reached && styles.timelineMuted,
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
  card: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  sectionLabel: { ...typography.caption, color: colors.gray500, textTransform: "uppercase" },
  image: { width: "100%", height: 160, borderRadius: radii.md, backgroundColor: colors.gray200 },
  productTitle: { ...typography.subtitle, color: colors.black },
  meta: { ...typography.body, color: colors.gray700 },
  amount: { ...typography.h2, color: colors.black },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  timelineEmoji: { fontSize: 18, width: 28 },
  timelineLabel: { ...typography.body, color: colors.gray700 },
  timelineCurrent: { color: colors.black, fontWeight: "700" },
  timelineMuted: { opacity: 0.35 },
});
