import { router } from "expo-router";
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/ui";
import { CommerceSectionHeader } from "../../design-system/components/CommerceSectionHeader";
import { OrderCard } from "../../design-system/components/OrderCard";
import { OrdersEmptyState } from "../../design-system/components/OrdersEmptyState";
import { OrdersHeader } from "../../design-system/components/OrdersHeader";
import { OrdersRecommendationsRail } from "../../design-system/components/OrdersRecommendationsRail";
import { OrdersSkeleton } from "../../design-system/components/OrdersSkeleton";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { surface, text } from "../../design-system/tokens/colors";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { useFadeIn } from "../../hooks/useFadeIn";
import type { OrdersDataState } from "./useOrdersData";

type Props = {
  state: OrdersDataState;
};

export function OrdersExperience({ state }: Props) {
  const insets = useSafeAreaInsets();
  const fade = useFadeIn();

  if (state.loading) {
    return <OrdersSkeleton />;
  }

  if (state.offlineBlocked) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="wifi-off" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Нет подключения</Text>
        <Text style={styles.offlineBody}>Сохранённые заказы недоступны. Откройте раздел при подключении к интернету.</Text>
        <PrimaryButton label="Повторить" onPress={() => void state.refresh()} />
      </View>
    );
  }

  const isEmpty = state.activeOrders.length === 0 && state.completedOrders.length === 0;

  if (isEmpty) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerPad}>
          <OrdersHeader activeCount={0} completedCount={0} fromCache={state.fromCache} />
        </View>
        {state.error ? <SectionErrorCard message={state.error} onRetry={() => void state.refresh()} /> : null}
        <OrdersEmptyState onBrowseCatalog={() => router.push("/(tabs)/catalog")} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing["2xl"] }]}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void state.refresh()} />}
    >
      <Animated.View style={{ opacity: fade, gap: spacing.lg }}>
        <OrdersHeader
          activeCount={state.activeCount}
          completedCount={state.completedCount}
          fromCache={state.fromCache}
        />

        {state.error ? <SectionErrorCard message={state.error} onRetry={() => void state.refresh()} /> : null}

        {state.activeOrders.length > 0 ? (
          <View style={styles.section}>
            <CommerceSectionHeader title="Активные заказы" subtitle="Следите за статусом покупки" />
            <View style={styles.cards}>
              {state.activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} onPress={() => router.push(`/order/${order.id}`)} />
              ))}
            </View>
          </View>
        ) : null}

        {state.completedOrders.length > 0 ? (
          <View style={styles.section}>
            <CommerceSectionHeader title="Завершённые заказы" />
            <View style={styles.cards}>
              {state.completedOrders.map((order) => (
                <OrderCard key={order.id} order={order} onPress={() => router.push(`/order/${order.id}`)} />
              ))}
            </View>
          </View>
        ) : null}

        <OrdersRecommendationsRail
          items={state.recommendations}
          failed={state.recommendationsFailed}
          onRetry={() => void state.retryRecommendations()}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.background },
  content: { paddingHorizontal: spacing.lg },
  headerPad: { paddingHorizontal: spacing.lg },
  section: { gap: spacing.sm },
  cards: { gap: spacing.md },
  offline: {
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
