import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { addToCart, fetchProduct, postTelemetry, toggleFavorite } from "../../src/api/endpoints";
import { loadAppConfig } from "../../src/config/env";
import {
  Badge,
  PrimaryButton,
  SecondaryButton,
  SellerCard,
  Price,
} from "../../src/components/ui";
import { resolveImageUrl } from "../../src/utils/format";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

const { width } = Dimensions.get("window");

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const offline = useAppStore((s) => s.offline);
  const config = loadAppConfig();
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetchProduct(id)
      .then((p) => {
        setProduct(p);
        postTelemetry({ screen: "product", event: "product_opened" });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function onAddToCart() {
    if (offline) {
      setMessage("Для этого действия требуется интернет");
      return;
    }
    if (!id) return;
    await addToCart(id, 1);
    await postTelemetry({ screen: "product", event: "add_to_cart" });
    setMessage("Добавлено в корзину");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Загрузка…</Text>
      </View>
    );
  }

  if (!product) return <Text style={styles.empty}>Товар не найден</Text>;

  const images = (product.images as Array<{ url: string }> | undefined) ?? [];
  const primary = product.primaryImage as { url?: string } | undefined;
  const gallery = images.length > 0 ? images : primary?.url ? [{ url: primary.url }] : [];
  const currentImage = gallery[imageIndex]?.url ?? primary?.url ?? null;
  const imageUrl = resolveImageUrl(currentImage, config.apiBaseUrl);
  const price = Number(product.price ?? 0);
  const compareAt = product.compareAt != null ? Number(product.compareAt) : null;
  const seller = product.seller as { storeName?: string } | undefined;
  const characteristics = (product.characteristics as Array<{ name: string; value: string }> | undefined) ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.gallery}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} contentFit="cover" />
        ) : (
          <View style={styles.heroFallback}>
            <Text style={styles.heroFallbackText}>ЛОТ</Text>
          </View>
        )}
        {gallery.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {gallery.map((img, idx) => (
              <Pressable key={`${img.url}-${idx}`} onPress={() => setImageIndex(idx)}>
                <Image
                  source={{ uri: resolveImageUrl(img.url, config.apiBaseUrl) ?? undefined }}
                  style={[styles.thumb, idx === imageIndex ? styles.thumbActive : null]}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <Price value={price} compareAt={compareAt} large />
      <Text style={styles.title}>{String(product.title ?? product.name ?? "Товар")}</Text>

      <View style={styles.badges}>
        <Badge label="Доставка" tone="neutral" />
        {Number(product.stock ?? 0) > 0 ? <Badge label="В наличии" tone="success" /> : <Badge label="Нет в наличии" tone="danger" />}
      </View>

      {seller?.storeName ? <SellerCard storeName={seller.storeName} subtitle="Проверенный продавец" /> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Описание</Text>
        <Text style={styles.body}>{String(product.description ?? "Описание скоро будет дополнено.")}</Text>
      </View>

      {characteristics.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Характеристики</Text>
          {characteristics.slice(0, 8).map((row) => (
            <View key={row.name} style={styles.charRow}>
              <Text style={styles.charName}>{row.name}</Text>
              <Text style={styles.charValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.ctaBlock}>
        <PrimaryButton label="В корзину" onPress={onAddToCart} fullWidth />
        <View style={styles.secondaryRow}>
          <SecondaryButton label="Избранное" onPress={() => id && toggleFavorite(id)} style={styles.secondaryBtn} />
          <SecondaryButton
            label="Поделиться"
            onPress={() => Share.share({ message: `lot://product/${id}`, url: `lot://product/${id}` })}
            style={styles.secondaryBtn}
          />
        </View>
        <Pressable onPress={() => router.push("/cart")}>
          <Text style={styles.cartLink}>Перейти в корзину</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { ...typography.body, color: colors.gray500 },
  container: { paddingBottom: spacing.xxl, backgroundColor: colors.white },
  gallery: { backgroundColor: colors.gray100 },
  heroImage: { width, height: width * 0.85 },
  heroFallback: { width, height: width * 0.85, alignItems: "center", justifyContent: "center" },
  heroFallbackText: { ...typography.display, color: colors.orange },
  thumbs: { padding: spacing.md, gap: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: radii.sm, borderWidth: 2, borderColor: "transparent" },
  thumbActive: { borderColor: colors.orange },
  title: { ...typography.h1, color: colors.black, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  badges: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm, flexWrap: "wrap" },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.sm },
  sectionTitle: { ...typography.h2, color: colors.black },
  body: { ...typography.body, color: colors.gray900 },
  charRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  charName: { ...typography.caption, color: colors.gray500, flex: 1 },
  charValue: { ...typography.body, color: colors.black, flex: 1, textAlign: "right" },
  ctaBlock: { padding: spacing.lg, gap: spacing.sm, marginTop: spacing.lg },
  secondaryRow: { flexDirection: "row", gap: spacing.sm },
  secondaryBtn: { flex: 1 },
  cartLink: { ...typography.caption, color: colors.orange, textAlign: "center", fontWeight: "600" },
  empty: { padding: spacing.lg, textAlign: "center" },
  message: { color: colors.orange, ...typography.caption, paddingHorizontal: spacing.lg },
});
