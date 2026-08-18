import { router } from "expo-router";
import { Image } from "expo-image";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { SecondaryButton } from "../../design-system/forms/buttons";
import { EmptyState, HomeSectionSkeleton } from "../../design-system/feedback/States";
import { PageContainer } from "../../design-system/layout/ScreenLayout";
import { Badge } from "../../design-system/primitives/Badge";
import { brand, border, surface, text } from "../../design-system/tokens/colors";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { formatPrice } from "../../utils/format";
import type { useSellerProductDetailData } from "./useSellerProductDetailData";

type Props = {
  state: ReturnType<typeof useSellerProductDetailData>;
  onActionPress: () => void;
};

export function SellerProductDetailExperience({ state, onActionPress }: Props) {
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
    return <EmptyState preset="products" actionLabel="Назад" onAction={() => router.back()} />;
  }

  const hero = detail.images[0]?.url ?? detail.imageUrl;

  return (
    <PageContainer style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {hero ? <Image source={{ uri: hero }} style={styles.hero} contentFit="cover" /> : null}
        <View style={styles.block}>
          <Text style={styles.title}>{detail.title}</Text>
          {detail.sku ? <Text style={styles.sku}>SKU {detail.sku}</Text> : null}
          <Text style={styles.price}>{formatPrice(detail.price)}</Text>
          <View style={styles.metaRow}>
            <Badge label={detail.statusLabel} tone={detail.statusTone} />
            <Text style={styles.meta}>Остаток {detail.stock}</Text>
            <Text style={styles.meta}>{detail.views} просмотров</Text>
            {detail.ordersCount > 0 ? <Text style={styles.meta}>{detail.ordersCount} продаж</Text> : null}
          </View>
          {detail.categoryName ? <Text style={styles.meta}>Категория: {detail.categoryName}</Text> : null}
          {detail.moderationStatus ? (
            <View style={styles.moderationBox}>
              <Text style={styles.moderationTitle}>{detail.moderationStatus}</Text>
              {detail.moderationReason ? <Text style={styles.moderationReason}>{detail.moderationReason}</Text> : null}
            </View>
          ) : null}
          {detail.description ? <Text style={styles.description}>{detail.description}</Text> : null}
        </View>

        <SecondaryButton label="Действия с товаром" onPress={onActionPress} />
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { width: "100%", height: 240, borderRadius: radii.lg, backgroundColor: surface.backgroundMuted },
  block: { gap: spacing.sm },
  title: { ...typography.h2, color: text.primary, fontWeight: "700" },
  sku: { ...typography.caption, color: text.muted },
  price: { ...typography.h2, color: brand.primary, fontWeight: "700" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  meta: { ...typography.caption, color: text.muted },
  moderationBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: surface.backgroundMuted,
    borderWidth: 1,
    borderColor: border.default,
    gap: spacing.xs,
  },
  moderationTitle: { ...typography.bodySmall, fontWeight: "600", color: text.primary },
  moderationReason: { ...typography.bodySmall, color: text.muted },
  description: { ...typography.bodySmall, color: text.secondary },
});
