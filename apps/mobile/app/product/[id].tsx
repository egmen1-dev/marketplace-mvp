import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Dimensions, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchCatalog, fetchProduct, postTelemetry, type MobileProductListItem } from "../../src/api/endpoints";
import { loadAppConfig } from "../../src/config/env";
import {
  Badge,
  PrimaryButton,
  ConnectedProductCard,
  ProductRatingRow,
  ProductReviewsSection,
  SecondaryButton,
  SectionHeader,
  SellerCard,
  Price,
  SkeletonGrid,
} from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { openProductConversation } from "../../src/hooks/useChatActions";
import { openSellerStorefront } from "../../src/navigation/seller-routes";
import { trackRecentView } from "../../src/storage/recent-views";
import { discountPercent, resolveImageUrl } from "../../src/utils/format";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

const { width } = Dimensions.get("window");

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const fade = useFadeIn();
  const offline = useAppStore((s) => s.offline);
  const { addProductToCart, toggleProductFavorite, isFavorite } = useCommerceActions();
  const config = loadAppConfig();
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [similar, setSimilar] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchProduct(id)
      .then(async (p) => {
        setProduct(p);
        await trackRecentView(p as MobileProductListItem);
        postTelemetry({ screen: "product", event: "product_opened" });
        const categoryId = (p.category as { id?: string } | null)?.id;
        const related = await fetchCatalog({ sort: "popular", categoryId }).catch(() => ({ items: [] }));
        setSimilar(related.items.filter((item) => item.id !== id).slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function onAddToCart() {
    if (!id) return;
    try {
      await addProductToCart(id, 1);
      await postTelemetry({ screen: "product", event: "add_to_cart" });
      setMessage("Добавлено в корзину");
    } catch {
      setMessage(null);
    }
  }

  async function onWriteSeller() {
    if (!id) return;
    try {
      await openProductConversation(id);
    } catch {
      setMessage("Войдите, чтобы написать продавцу");
    }
  }

  async function onToggleFavorite() {
    if (!id) return;
    try {
      await toggleProductFavorite(id);
    } catch {
      // toast handled in hook
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <SkeletonGrid count={1} />
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
  const seller = product.seller as { id?: string; storeName?: string; isVerified?: boolean } | undefined;
  const characteristics = (product.characteristics as Array<{ name: string; displayValue: string }> | undefined) ?? [];
  const pickupPoints = (product.pickupPoints as Array<{ city?: string; name?: string }> | undefined) ?? [];
  const favoritesCount = Number(product.favoritesCount ?? 0);
  const views = Number(product.views ?? 0);
  const averageRating = product.averageRating != null ? Number(product.averageRating) : null;
  const reviewsCount = Number(product.reviewsCount ?? 0);
  const discount = discountPercent(price, compareAt);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 + insets.bottom }]}>
        <Animated.View style={{ opacity: fade }}>
          <View style={styles.gallery}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.heroImage} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.heroFallback}>
                <Text style={styles.heroFallbackText}>ЛОТ</Text>
              </View>
            )}
            {discount ? <Badge label={`-${discount}%`} tone="brand" style={styles.discountBadge} /> : null}
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

          <View style={styles.content}>
            <Price value={price} compareAt={compareAt} large />
            <Text style={styles.title}>{String(product.title ?? product.name ?? "Товар")}</Text>

            <View style={styles.badges}>
              <Badge label="Доставка СДЭК" tone="neutral" />
              {Number(product.stock ?? 0) > 0 ? <Badge label="В наличии" tone="success" /> : <Badge label="Нет в наличии" tone="danger" />}
            </View>

            <ProductRatingRow averageRating={averageRating} reviewsCount={reviewsCount} />

            <View style={styles.trustRow}>
              {favoritesCount > 0 ? (
                <View style={styles.trustItem}>
                  <MaterialCommunityIcons name="heart" size={16} color={colors.orange} />
                  <Text style={styles.trustText}>{favoritesCount} в избранном</Text>
                </View>
              ) : null}
              {views > 0 ? (
                <View style={styles.trustItem}>
                  <MaterialCommunityIcons name="eye-outline" size={16} color={colors.gray500} />
                  <Text style={styles.trustText}>{views} просмотров</Text>
                </View>
              ) : null}
              {seller?.isVerified ? <Badge label="Проверенный продавец" tone="success" /> : null}
            </View>

            {seller?.storeName ? (
              <SellerCard
                storeName={seller.storeName}
                subtitle="Продавец на ЛОТ"
                onPress={seller.id ? () => openSellerStorefront(seller.id!, seller.storeName) : undefined}
              />
            ) : null}

            {seller?.id ? (
              <SecondaryButton label="Написать продавцу" onPress={onWriteSeller} />
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Доставка</Text>
              <Text style={styles.body}>
                {pickupPoints.length > 0
                  ? `Доступна доставка и самовывоз: ${pickupPoints[0]?.city ?? "ваш город"}`
                  : "Доставка через партнёров маркетплейса. Сроки уточняются при оформлении."}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Описание</Text>
              <Text style={styles.body}>{String(product.description ?? "Подробное описание скоро будет дополнено.")}</Text>
            </View>

            {characteristics.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Характеристики</Text>
                {characteristics.slice(0, 10).map((row) => (
                  <View key={row.name} style={styles.charRow}>
                    <Text style={styles.charName}>{row.name}</Text>
                    <Text style={styles.charValue}>{row.displayValue}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {id ? <ProductReviewsSection productId={id} /> : null}

            {similar.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title="Похожие товары" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
                  {similar.map((item) => (
                    <ConnectedProductCard
                      key={item.id}
                      product={item}
                      compact
                      isFavorite={isFavorite(item.id)}
                      onPress={() => router.push(`/product/${item.id}`)}
                      onFavorite={() => toggleProductFavorite(item.id)}
                      onSellerPress={item.seller?.id ? () => openSellerStorefront(item.seller!.id!, item.seller?.storeName) : undefined}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.stickyActions}>
          <SecondaryButton
            label={id && isFavorite(id) ? "В избранном" : "Избранное"}
            onPress={onToggleFavorite}
            style={styles.secondaryBtn}
          />
          <PrimaryButton label="В корзину" onPress={onAddToCart} style={styles.primaryBtn} />
        </View>
        <Pressable onPress={() => Share.share({ message: `lot://product/${id}`, url: `lot://product/${id}` })}>
          <Text style={styles.shareLink}>Поделиться товаром</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  loadingWrap: { flex: 1, padding: spacing.lg },
  container: { backgroundColor: colors.white },
  gallery: { backgroundColor: colors.gray100 },
  heroImage: { width, height: width * 0.92 },
  heroFallback: { width, height: width * 0.92, alignItems: "center", justifyContent: "center" },
  heroFallbackText: { ...typography.display, color: colors.orange },
  discountBadge: { position: "absolute", top: spacing.lg, left: spacing.lg },
  thumbs: { padding: spacing.md, gap: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: radii.sm, borderWidth: 2, borderColor: "transparent" },
  thumbActive: { borderColor: colors.orange },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h1, color: colors.black },
  badges: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  trustRow: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap", alignItems: "center" },
  trustItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  trustText: { ...typography.caption, color: colors.gray700 },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.h2, color: colors.black },
  body: { ...typography.body, color: colors.gray900 },
  charRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  charName: { ...typography.caption, color: colors.gray500, flex: 1 },
  charValue: { ...typography.body, color: colors.black, flex: 1, textAlign: "right" },
  similarRow: { gap: spacing.md, paddingVertical: spacing.sm },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  stickyActions: { flexDirection: "row", gap: spacing.sm },
  primaryBtn: { flex: 2 },
  secondaryBtn: { flex: 1 },
  shareLink: { ...typography.caption, color: colors.orange, textAlign: "center", fontWeight: "600" },
  empty: { padding: spacing.lg, textAlign: "center" },
  message: { color: colors.orange, ...typography.caption, textAlign: "center" },
});
