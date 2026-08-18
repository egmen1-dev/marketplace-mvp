import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { SecondaryButton } from "../../design-system/forms/buttons";
import { EmptyState, HomeSectionSkeleton } from "../../design-system/feedback/States";
import { PageContainer } from "../../design-system/layout/ScreenLayout";
import { Badge } from "../../design-system/primitives/Badge";
import { brand, border, semantic, surface, text } from "../../design-system/tokens/colors";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { formatPrice } from "../../utils/format";
import type { useSellerOrderDetailData } from "./useSellerOrderDetailData";

type Props = {
  state: ReturnType<typeof useSellerOrderDetailData>;
  onActionPress: () => void;
};

export function SellerOrderDetailExperience({ state, onActionPress }: Props) {
  const { detail, loading, error, refresh } = state;

  if (loading && !detail) {
    return (
      <PageContainer style={styles.container}>
        <HomeSectionSkeleton />
      </PageContainer>
    );
  }

  if (error && !detail) {
    return (
      <PageContainer style={styles.container}>
        <SectionErrorCard message={error} onRetry={() => void refresh()} />
      </PageContainer>
    );
  }

  if (!detail) {
    return <EmptyState preset="sales" actionLabel="Назад" onAction={() => router.back()} />;
  }

  return (
    <PageContainer style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.block}>
          <Text style={styles.title}>Заказ № {detail.orderNumber}</Text>
          <Text style={styles.date}>{detail.createdAtLabel}</Text>
          <View style={styles.metaRow}>
            <Badge label={detail.statusLabel} tone={detail.statusTone} />
            <Badge label={detail.fulfillmentLabel} tone="neutral" />
          </View>
          {detail.isOverdue ? <Text style={styles.overdue}>Просрочен — требуется действие</Text> : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Покупатель</Text>
          <Text style={styles.body}>{detail.buyerName}</Text>
          {detail.buyerEmail ? <Text style={styles.meta}>{detail.buyerEmail}</Text> : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Позиции</Text>
          {detail.items.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineTitle}>{item.productName}</Text>
                <Text style={styles.linePrice}>{formatPrice(item.totalPrice, detail.currency)}</Text>
              </View>
              <Text style={styles.meta}>
                {item.quantity} шт.{item.sku ? ` · SKU ${item.sku}` : ""}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Сумма продавца</Text>
          <Text style={styles.totalValue}>{formatPrice(detail.sellerSubtotal, detail.currency)}</Text>
        </View>

        <SecondaryButton label="Действия с заказом" onPress={onActionPress} />
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  block: { gap: spacing.sm },
  title: { ...typography.h2, color: text.primary, fontWeight: "700" },
  date: { ...typography.caption, color: text.muted },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  overdue: { ...typography.bodySmall, color: semantic.danger, fontWeight: "700" },
  sectionTitle: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  body: { ...typography.body, color: text.primary },
  meta: { ...typography.caption, color: text.muted },
  lineItem: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: surface.backgroundMuted,
    borderWidth: 1,
    borderColor: border.default,
    gap: spacing.xs,
  },
  lineHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  lineTitle: { ...typography.bodySmall, color: text.primary, flex: 1, fontWeight: "600" },
  linePrice: { ...typography.bodySmall, color: brand.primary, fontWeight: "700" },
  totalBox: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.default,
    gap: spacing.xs,
  },
  totalLabel: { ...typography.caption, color: text.muted },
  totalValue: { ...typography.h2, color: brand.primary, fontWeight: "700" },
});
