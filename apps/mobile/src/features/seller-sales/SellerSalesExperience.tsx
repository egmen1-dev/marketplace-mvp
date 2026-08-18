import { router } from "expo-router";
import { Animated, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageContainer } from "../../design-system/layout/ScreenLayout";
import { EmptyState, SkeletonGrid } from "../../design-system/feedback/States";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { surface, text } from "../../design-system/tokens/colors";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { useFadeIn } from "../../hooks/useFadeIn";
import { loadAppConfig } from "../../config/env";
import * as Linking from "expo-linking";
import { postTelemetry } from "../../api/endpoints";
import { formatSellerSaleAmount, type SellerSalesState } from "./useSellerSalesData";
import type { SellerSaleCardView } from "./types";

type Props = {
  state: SellerSalesState;
};

function SellerSaleCard({ order, onPress }: { order: SellerSaleCardView; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Продажа ${order.orderNumber}, ${order.statusLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>№ {order.orderNumber}</Text>
        <Text style={styles.status}>{order.statusLabel}</Text>
      </View>
      <Text style={styles.buyer}>Покупатель: {order.buyerName}</Text>
      {order.previewTitle ? <Text style={styles.preview} numberOfLines={1}>{order.previewTitle}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={styles.amount}>{formatSellerSaleAmount(order)}</Text>
        <Text style={styles.meta}>{order.itemCount} шт. · {order.createdAtLabel}</Text>
      </View>
      {order.isOverdue ? <Text style={styles.overdue}>Требует срочного действия</Text> : null}
    </Pressable>
  );
}

export function SellerSalesExperience({ state }: Props) {
  const insets = useSafeAreaInsets();
  const fade = useFadeIn();

  if (!state.sellerCapable) {
    return (
      <EmptyState
        title="Режим продавца недоступен"
        description="Войдите под аккаунтом продавца, чтобы видеть продажи."
        actionLabel="В профиль"
        onAction={() => router.push("/(tabs)/profile")}
      />
    );
  }

  if (state.loading && state.orders.length === 0) {
    return (
      <PageContainer style={styles.container}>
        <SkeletonGrid count={2} />
      </PageContainer>
    );
  }

  if (state.offline && state.orders.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="wifi-off" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Нет подключения</Text>
        <Text style={styles.offlineBody}>Список продаж недоступен офлайн без сохранённых данных.</Text>
      </View>
    );
  }

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, flex: 1, gap: spacing.md }}>
        {state.fromCache ? <Text style={styles.cacheHint}>Показаны сохранённые продажи</Text> : null}
        {state.error ? <SectionErrorCard message={state.error} onRetry={() => void state.refresh()} /> : null}
        <FlatList
          data={state.orders}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void state.refresh()} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
          renderItem={({ item }) => (
            <SellerSaleCard
              order={item}
              onPress={() => {
                void postTelemetry({ screen: "seller_sales", event: "seller_sale_opened", errorCode: item.id });
                const config = loadAppConfig();
                void Linking.openURL(`${config.apiBaseUrl}/account/sales?order=${encodeURIComponent(item.id)}`);
              }}
            />
          )}
          ListEmptyComponent={
            !state.loading ? (
              <EmptyState
                preset="sales"
                actionLabel="Обновить"
                onAction={() => void state.refresh()}
              />
            ) : null
          }
        />
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  list: { gap: spacing.md },
  card: {
    backgroundColor: surface.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardPressed: { opacity: 0.92 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  orderNumber: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  status: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  buyer: { ...typography.body, color: text.primary },
  preview: { ...typography.caption, color: text.muted },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  amount: { ...typography.price, color: text.primary },
  meta: { ...typography.caption, color: text.muted },
  overdue: { ...typography.caption, color: "#DC2626", fontWeight: "600" },
  cacheHint: { ...typography.caption, color: text.muted },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
    backgroundColor: surface.background,
  },
  offlineTitle: { ...typography.h2, color: text.primary },
  offlineBody: { ...typography.body, color: text.secondary, textAlign: "center" },
});
