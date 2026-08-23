import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  fetchSellerOrders,
  patchSellerOrderStatus,
  type MobileSellerOrder,
  type MobileSellerOrderTab,
} from "../../src/api/endpoints";
import {
  Badge,
  Chip,
  EmptyState,
  PageScroll,
  PrimaryButton,
  SectionHeader,
  SkeletonGrid,
} from "../../src/components/ui";
import { sellerOrderActionLabel } from "../../src/commerce/order-status";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";
import { formatPrice } from "../../src/utils/format";

const TABS: Array<{ key: MobileSellerOrderTab; label: string }> = [
  { key: "new", label: "Новые" },
  { key: "in_progress", label: "В работе" },
  { key: "completed", label: "Завершенные" },
];

const STATUS_LABELS: Record<MobileSellerOrder["status"], string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  SHIPPED: "Отправлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

export default function SellerSalesScreen() {
  const fade = useFadeIn();
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [tab, setTab] = useState<MobileSellerOrderTab>("new");
  const [orders, setOrders] = useState<MobileSellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSellerOrders(tab);
      setOrders(res.orders);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (sellerCapable) void load();
    else setLoading(false);
  }, [sellerCapable, load]);

  async function onAction(order: MobileSellerOrder, nextStatus: string) {
    setActingId(order.id);
    try {
      await patchSellerOrderStatus(order.id, nextStatus);
      await load();
    } finally {
      setActingId(null);
    }
  }

  if (!sellerCapable) {
    return (
      <PageScroll>
        <EmptyState
          title="Продажи недоступны"
          description="Подключите продавца, чтобы видеть заказы покупателей."
        />
      </PageScroll>
    );
  }

  return (
    <PageScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
      <Animated.View style={{ opacity: fade, gap: spacing.lg, padding: spacing.lg }}>
        <SectionHeader title="Продажи" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => (
            <Chip key={item.key} label={item.label} active={tab === item.key} onPress={() => setTab(item.key)} />
          ))}
        </ScrollView>

        {loading && orders.length === 0 ? (
          <SkeletonGrid count={2} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Заказов пока нет"
            description="Когда покупатель оформит заказ, он появится в этой вкладке."
            actionLabel="Обновить"
            onAction={() => void load()}
          />
        ) : (
          orders.map((order) => (
            <SellerOrderCard
              key={order.id}
              order={order}
              acting={actingId === order.id}
              onAction={(status) => void onAction(order, status)}
            />
          ))
        )}
      </Animated.View>
    </PageScroll>
  );
}

function SellerOrderCard({
  order,
  acting,
  onAction,
}: {
  order: MobileSellerOrder;
  acting: boolean;
  onAction: (status: string) => void;
}) {
  const nextStatus = pickSellerNextStatus(order.rawStatus);
  const buyerName = order.buyer.name?.trim() || order.buyer.email.split("@")[0] || "Покупатель";

  return (
    <View style={styles.card}>
      {order.product.imageUrl ? (
        <Image source={{ uri: order.product.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>Фото</Text>
        </View>
      )}

      <Text style={styles.productTitle}>{order.product.title}</Text>
      <Text style={styles.meta}>Количество: {order.quantity}</Text>
      <Text style={styles.amount}>Сумма: {formatPrice(order.amount)}</Text>
      <Text style={styles.meta}>Покупатель: {buyerName}</Text>
      <View style={styles.statusRow}>
        <Text style={styles.meta}>Статус:</Text>
        <Badge label={STATUS_LABELS[order.status]} tone={order.status === "NEW" ? "warning" : "neutral"} />
      </View>

      {nextStatus ? (
        <PrimaryButton
          label={sellerOrderActionLabel(nextStatus)}
          fullWidth
          loading={acting}
          onPress={() => onAction(nextStatus)}
        />
      ) : null}
    </View>
  );
}

function pickSellerNextStatus(rawStatus: string): string | null {
  switch (rawStatus) {
    case "NEW":
    case "PAID":
    case "AWAITING_SELLER_CONFIRMATION":
      return "CONFIRMED";
    case "CONFIRMED":
      return "PROCESSING";
    case "PROCESSING":
      return "READY_FOR_SHIPMENT";
    case "READY_FOR_SHIPMENT":
      return "SHIPPED";
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  tabs: { gap: spacing.sm, paddingBottom: spacing.xs },
  card: {
    backgroundColor: colors.gray100,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  image: { width: "100%", height: 140, borderRadius: radii.md, backgroundColor: colors.gray200 },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  imagePlaceholderText: { ...typography.caption, color: colors.gray500 },
  productTitle: { ...typography.subtitle, color: colors.black },
  meta: { ...typography.body, color: colors.gray700 },
  amount: { ...typography.subtitle, color: colors.black },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
