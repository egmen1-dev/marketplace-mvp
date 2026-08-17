import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GhostButton, PrimaryButton } from "../../components/ui";
import { IconButton } from "../../design-system/components/IconButton";
import { OrderDetailSections } from "../../design-system/components/OrderDetailSections";
import { OrderDetailSkeleton } from "../../design-system/components/OrderDetailSkeleton";
import { OrderTimeline } from "../../design-system/components/OrderTimeline";
import { PrimaryCTA } from "../../design-system/components/PrimaryCTA";
import { brand, surface, text } from "../../design-system/tokens/colors";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import type { OrderDetailState } from "./useOrderDetailData";

type Props = {
  state: OrderDetailState;
};

export function OrderDetailExperience({ state }: Props) {
  const insets = useSafeAreaInsets();

  if (state.loading) {
    return <OrderDetailSkeleton />;
  }

  if (state.offlineBlocked) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="wifi-off" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Нет подключения</Text>
        <Text style={styles.offlineBody}>Этот заказ не сохранён офлайн. Откройте его при подключении к интернету.</Text>
        <PrimaryButton label="Повторить" onPress={() => void state.refresh()} />
      </View>
    );
  }

  if (!state.order) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="package-variant-remove" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Заказ не найден</Text>
        {state.error ? <Text style={styles.offlineBody}>{state.error}</Text> : null}
        <PrimaryButton label="Повторить" onPress={() => void state.refresh()} />
      </View>
    );
  }

  const order = state.order;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing["3xl"] }]}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={styles.orderNumber}>Заказ {order.orderNumber}</Text>
              <Text style={styles.status}>{order.statusLabel}</Text>
              <Text style={styles.date}>{order.createdAtLabel}</Text>
            </View>
            <IconButton accessibilityLabel="Поделиться заказом" variant="muted" onPress={() => void state.onShare()}>
              <MaterialCommunityIcons name="share-variant-outline" size={20} color={text.primary} />
            </IconButton>
          </View>
          {state.fromCache ? (
            <Text style={styles.cacheHint}>Показана сохранённая версия без сети</Text>
          ) : null}
        </View>

        <OrderTimeline steps={order.timeline} />
        <OrderDetailSections order={order} />

        {state.reorderMessage ? (
          <Text style={styles.message} accessibilityLiveRegion="polite">
            {state.reorderMessage}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <PrimaryCTA label="Повторить заказ" fullWidth loading={state.reorderBusy} onPress={() => void state.onReorder()} />
          <GhostButton label="Открыть на сайте" onPress={state.onOpenWeb} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: { gap: spacing.sm },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  orderNumber: { ...typography.h1, color: text.primary },
  status: { ...typography.subtitle, color: brand.primary, fontWeight: "700" },
  date: { ...typography.bodySmall, color: text.muted },
  cacheHint: { ...typography.caption, color: text.muted },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  message: { ...typography.bodySmall, color: text.secondary, textAlign: "center" },
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
