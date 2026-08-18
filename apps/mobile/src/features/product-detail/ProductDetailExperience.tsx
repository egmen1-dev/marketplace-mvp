import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/ui";
import { PdpDeliveryBlock } from "../../design-system/components/PdpDeliveryBlock";
import { PdpDescription } from "../../design-system/components/PdpDescription";
import { PdpGallery } from "../../design-system/components/PdpGallery";
import { PdpHeroPrice } from "../../design-system/components/PdpHeroPrice";
import { PdpHighlights } from "../../design-system/components/PdpHighlights";
import { PdpRelatedRail } from "../../design-system/components/PdpRelatedRail";
import { PdpSellerCard } from "../../design-system/components/PdpSellerCard";
import { PdpSkeleton } from "../../design-system/components/PdpSkeleton";
import { PdpSpecsTable } from "../../design-system/components/PdpSpecsTable";
import { PdpStickyCta } from "../../design-system/components/PdpStickyCta";
import { PdpTrustBlock } from "../../design-system/components/PdpTrustBlock";
import { surface, text } from "../../design-system/tokens/colors";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import type { ProductDetailState } from "./useProductDetailData";

const STICKY_HEIGHT = 112;

type Props = {
  state: ProductDetailState;
};

export function ProductDetailExperience({ state }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = STICKY_HEIGHT + insets.bottom + spacing.lg;

  if (state.loading) {
    return <PdpSkeleton />;
  }

  if (state.offlineBlocked) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="wifi-off" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Нет подключения</Text>
        <Text style={styles.offlineBody}>Карточка товара недоступна офлайн. Откройте товар при подключении к интернету или вернитесь к ранее просмотренным товарам.</Text>
        <PrimaryButton label="Повторить" onPress={() => void state.refresh()} />
      </View>
    );
  }

  if (!state.product) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="package-variant-remove" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Товар не найден</Text>
        {state.error ? <Text style={styles.offlineBody}>{state.error}</Text> : null}
        <PrimaryButton label="Повторить" onPress={() => void state.refresh()} />
      </View>
    );
  }

  const product = state.product;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}>
        <PdpGallery images={product.images} discount={product.discount} />
        <View style={styles.body}>
          <PdpHeroPrice price={product.price} compareAt={product.compareAt} />
          <Text style={styles.title} accessibilityRole="header">
            {product.title}
          </Text>
          {state.fromCache ? (
            <View style={styles.cacheBanner}>
              <MaterialCommunityIcons name="cloud-off-outline" size={16} color={text.muted} />
              <Text style={styles.cacheText}>Показана сохранённая версия без сети</Text>
            </View>
          ) : null}
          <PdpTrustBlock items={product.trustItems} />
          <PdpDeliveryBlock pickupPoints={product.pickupPoints} />
          <PdpHighlights items={product.highlights} />
          {product.description ? <PdpDescription description={product.description} /> : null}
          <PdpSpecsTable rows={product.characteristics} />
          {product.seller ? (
            <PdpSellerCard
              seller={product.seller}
              onPress={() => router.push({ pathname: "/seller/[id]", params: { id: product.seller!.id } })}
            />
          ) : null}
          <PdpRelatedRail items={state.related} failed={state.relatedFailed} onRetry={() => void state.refresh()} />
        </View>
      </ScrollView>

      <PdpStickyCta
        bottomInset={insets.bottom}
        inStock={product.stock > 0}
        adding={state.addingToCart}
        success={state.cartSuccess}
        message={state.cartMessage}
        isFavorite={state.isFavorite}
        favoriteBusy={state.favoriteBusy}
        onAddToCart={() => void state.onAddToCart()}
        onToggleFavorite={() => void state.onToggleFavorite()}
        onShare={() => void state.onShare()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.background },
  content: { backgroundColor: surface.background },
  body: { padding: spacing.lg, gap: spacing.lg },
  title: { ...typography.h1, color: text.primary },
  cacheBanner: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  cacheText: { ...typography.caption, color: text.muted },
  offline: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
    backgroundColor: surface.background,
  },
  offlineTitle: { ...typography.h2, color: text.primary, textAlign: "center" },
  offlineBody: { ...typography.body, color: text.secondary, textAlign: "center" },
});
