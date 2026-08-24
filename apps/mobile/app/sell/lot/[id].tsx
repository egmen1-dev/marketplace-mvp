import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchSellerLot, type SellerLotDetail } from "../../../src/api/seller-lot";
import { Badge, ErrorState, PrimaryButton, SecondaryButton } from "../../../src/components/ui";
import { ProductImageFallback } from "../../../src/components/ui/ProductImageFallback";
import { loadAppConfig } from "../../../src/config/env";
import { moderationStatusLabel, productStatusLabel, productStatusTone } from "../../../src/theme/status-labels";
import { formatPrice, resolveImageUrl } from "../../../src/utils/format";
import { colors, radii, spacing, typography } from "../../../src/theme/tokens";

export default function SellerLotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const config = loadAppConfig();
  const [lot, setLot] = useState<SellerLotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSellerLot(id)
      .then((detail: SellerLotDetail) => setLot(detail))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Не удалось загрузить ЛОТ"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>Загружаем ЛОТ…</Text>
      </View>
    );
  }

  if (error || !lot) {
    return <ErrorState title="ЛОТ не найден" description={error ?? "Проверьте подключение и попробуйте снова"} />;
  }

  const imageUrl = resolveImageUrl(lot.images[0]?.url ?? null, config.apiBaseUrl);
  const moderationLabel = moderationStatusLabel(lot.moderationState);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "Мой ЛОТ" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageWrap}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" /> : <ProductImageFallback />}
        </View>
        <Text style={styles.title}>{lot.title}</Text>
        <Text style={styles.price}>{formatPrice(lot.price)}</Text>
        <View style={styles.badges}>
          <Badge label={productStatusLabel(lot.status)} tone={productStatusTone(lot.status)} />
          {moderationLabel ? <Badge label={moderationLabel} tone="warning" /> : null}
        </View>
        {lot.city ? <Text style={styles.meta}>Город: {lot.city}</Text> : null}
        {lot.description ? <Text style={styles.description}>{lot.description}</Text> : null}
        {lot.pickupEnabled && lot.pickupPoints.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Самовывоз</Text>
            {lot.pickupPoints.map((point) => (
              <Text key={point.id} style={styles.meta}>
                {point.name} · {point.city}, {point.address}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Мои ЛОТы" fullWidth onPress={() => router.replace("/(tabs)/seller-products")} />
        {lot.isPublic ? (
          <SecondaryButton label="Открыть как покупатель" fullWidth onPress={() => router.push(`/product/${lot.id}`)} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.md },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.gray100,
  },
  image: { width: "100%", height: "100%" },
  title: { ...typography.h1, color: colors.black },
  price: { ...typography.price, color: colors.orange },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  meta: { ...typography.body, color: colors.gray700 },
  description: { ...typography.body, color: colors.gray700 },
  section: { gap: spacing.xs },
  sectionTitle: { ...typography.h2, color: colors.black },
  subtitle: { ...typography.body, color: colors.gray500 },
  footer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.gray200 },
});
