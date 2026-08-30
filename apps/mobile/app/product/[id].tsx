import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchCatalog, fetchProduct, fetchSellerStorefront, postTelemetry, type MobileProductListItem } from "../../src/api/endpoints";
import { getCartQuantity, useCartQuantitiesStore } from "../../src/commerce/cart-quantities-store";
import { loadAppConfig } from "../../src/config/env";
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { openProductConversation } from "../../src/hooks/useChatActions";
import { openSellerStorefront } from "../../src/navigation/seller-routes";
import {
  ProductCharacteristicsCard,
  ProductDeliveryCard,
  ProductDescriptionCard,
  ProductDetailHeader,
  ProductDetailSkeleton,
  ProductGallery,
  ProductPriceCard,
  ProductRelatedRail,
  ProductReviewsCard,
  ProductSection,
  ProductSectionDivider,
  ProductSellerCard,
  ProductSocialProof,
  ProductStickyPurchaseBar,
  isHitProduct,
  stickyBarContentInset,
} from "../../src/product/ui";
import { trackRecentView } from "../../src/storage/recent-views";
import { colors, spacing, typography } from "../../src/theme/tokens";
import { discountPercent, resolveImageUrl } from "../../src/utils/format";

type ProductRecord = Record<string, unknown>;

type PickupPoint = {
  id: string;
  name: string;
  city: string;
  address: string;
};

type Characteristic = {
  name: string;
  displayValue: string;
};

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const config = loadAppConfig();
  const scrollRef = useRef<ScrollView>(null);
  const similarYRef = useRef(0);
  const cartQuantity = useCartQuantitiesStore((s) => (id ? s.quantities[id] ?? 0 : 0));
  const { addProductToCart, incrementProductCart, decrementProductCart, toggleProductFavorite, isFavorite } =
    useCommerceActions();

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [similar, setSimilar] = useState<MobileProductListItem[]>([]);
  const [sellerTrust, setSellerTrust] = useState<{ badges: string[]; respondsInChat: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const p = await fetchProduct(id);
      setProduct(p);
      await trackRecentView(p as MobileProductListItem);
      postTelemetry({ screen: "product", event: "product_opened" });

      const seller = p.seller as { id?: string } | undefined;
      const categoryId = (p.category as { id?: string } | null)?.id;

      const [related, storefront] = await Promise.all([
        fetchCatalog({ sort: "popular", categoryId }).catch(() => ({ items: [] as MobileProductListItem[] })),
        seller?.id ? fetchSellerStorefront(seller.id).catch(() => null) : Promise.resolve(null),
      ]);

      setSimilar(related.items.filter((item) => item.id !== id).slice(0, 6));
      if (storefront) {
        setSellerTrust({ badges: storefront.badges ?? [], respondsInChat: storefront.respondsInChat });
      } else {
        setSellerTrust(null);
      }
    } catch {
      setProduct(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const derived = useMemo(() => {
    if (!product) return null;

    const images = (product.images as Array<{ url: string }> | undefined) ?? [];
    const primary = product.primaryImage as { url?: string } | undefined;
    const gallery = images.length > 0 ? images : primary?.url ? [{ url: primary.url }] : [];
    const price = Number(product.price ?? 0);
    const compareAt = product.compareAt != null ? Number(product.compareAt) : null;
    const seller = product.seller as { id?: string; storeName?: string; isVerified?: boolean } | undefined;
    const characteristics = (product.characteristics as Characteristic[] | undefined) ?? [];
    const pickupPoints = (product.pickupPoints as PickupPoint[] | undefined) ?? [];
    const favoritesCount = Number(product.favoritesCount ?? 0);
    const views = Number(product.views ?? 0);
    const averageRating = product.averageRating != null ? Number(product.averageRating) : null;
    const reviewsCount = Number(product.reviewsCount ?? 0);
    const stock = Number(product.stock ?? 0);
    const title = String(product.title ?? product.name ?? "Товар");
    const description = String(product.description ?? "");
    const discount = discountPercent(price, compareAt);

    return {
      gallery,
      price,
      compareAt,
      seller,
      characteristics,
      pickupPoints,
      favoritesCount,
      views,
      averageRating,
      reviewsCount,
      stock,
      title,
      description,
      discount,
      inStock: stock > 0,
      showHitBadge: isHitProduct(views, favoritesCount),
    };
  }, [product]);

  const trustChips = useMemo(() => {
    if (!derived?.seller) return [];
    const chips: Array<{ id: string; icon: "shield-check" | "message-text-outline" | "star" | "truck-delivery-outline"; label: string }> = [];
    for (const badge of sellerTrust?.badges ?? []) {
      chips.push({ id: `badge-${badge}`, icon: "star", label: badge });
    }
    return chips.slice(0, 3);
  }, [derived?.seller, sellerTrust]);

  function scrollToSimilar() {
    scrollRef.current?.scrollTo({ y: Math.max(0, similarYRef.current - 12), animated: true });
  }

  async function onWriteSeller() {
    if (!id) return;
    try {
      await openProductConversation(id);
    } catch {
      // auth toast handled in hook
    }
  }

  async function onBuyNow() {
    if (!id || !derived?.inStock) return;
    setBuyNowLoading(true);
    try {
      const qty = getCartQuantity(id);
      if (qty <= 0) {
        await addProductToCart(id, 1);
      }
      await postTelemetry({ screen: "product", event: "buy_now" });
      router.push("/checkout");
    } catch {
      // toast handled in commerce hook
    } finally {
      setBuyNowLoading(false);
    }
  }

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product || !derived || !id) {
    return (
      <View style={styles.errorScreen}>
        <ProductDetailHeader productId={id ?? ""} isFavorite={false} onToggleFavorite={() => undefined} />
        <View style={styles.errorBody}>
          <Text style={styles.errorTitle}>Не удалось загрузить товар</Text>
          <Pressable style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Повторить</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const resolveUrl = (url: string) => resolveImageUrl(url, config.apiBaseUrl);
  const hasSimilar = similar.length > 0;

  return (
    <View style={styles.screen}>
      <ProductDetailHeader
        productId={id}
        isFavorite={isFavorite(id)}
        onToggleFavorite={() => void toggleProductFavorite(id)}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: stickyBarContentInset(insets.bottom) }]}
      >
        <ProductGallery
          images={derived.gallery}
          resolveUrl={resolveUrl}
          discountPercent={derived.discount}
          showHitBadge={derived.showHitBadge}
          showSimilarButton={hasSimilar}
          onSimilarPress={hasSimilar ? scrollToSimilar : undefined}
        />

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{derived.title}</Text>
          <ProductSocialProof averageRating={derived.averageRating} reviewsCount={derived.reviewsCount} />
        </View>

        <ProductSection style={styles.priceSection}>
          <ProductPriceCard price={derived.price} compareAt={derived.compareAt} />
        </ProductSection>

        {derived.seller?.storeName ? (
          <>
            <ProductSectionDivider />
            <ProductSection>
              <ProductSellerCard
                storeName={derived.seller.storeName}
                isVerified={derived.seller.isVerified}
                trustChips={trustChips}
                showWriteButton={Boolean(derived.seller.id)}
                showAllProductsLink={Boolean(derived.seller.id)}
                onWriteSeller={() => void onWriteSeller()}
                onViewAllProducts={
                  derived.seller.id
                    ? () => openSellerStorefront(derived.seller!.id!, derived.seller!.storeName)
                    : undefined
                }
              />
            </ProductSection>
          </>
        ) : null}

        {derived.pickupPoints.length > 0 ? (
          <>
            <ProductSectionDivider />
            <ProductSection>
              <ProductDeliveryCard pickupPoints={derived.pickupPoints} />
            </ProductSection>
          </>
        ) : null}

        {derived.characteristics.length > 0 ? (
          <>
            <ProductSectionDivider />
            <ProductSection>
              <ProductCharacteristicsCard characteristics={derived.characteristics} />
            </ProductSection>
          </>
        ) : null}

        {derived.description.trim() ? (
          <>
            <ProductSectionDivider />
            <ProductSection>
              <ProductDescriptionCard description={derived.description} />
            </ProductSection>
          </>
        ) : null}

        <ProductSectionDivider />
        <ProductSection>
          <ProductReviewsCard productId={id} />
        </ProductSection>

        {hasSimilar ? (
          <View
            onLayout={(e) => {
              similarYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <ProductSectionDivider />
            <ProductRelatedRail
              title="Похожие товары"
              items={similar}
              isFavorite={isFavorite}
              onPressProduct={(productId) => router.push(`/product/${productId}`)}
              onFavorite={(productId) => void toggleProductFavorite(productId)}
            />
          </View>
        ) : null}
      </ScrollView>

      <ProductStickyPurchaseBar
        price={derived.price}
        quantity={cartQuantity}
        inStock={derived.inStock}
        buyNowLoading={buyNowLoading}
        onAddToCart={() => void addProductToCart(id, 1)}
        onIncrement={() => void incrementProductCart(id)}
        onDecrement={() => void decrementProductCart(id)}
        onBuyNow={() => void onBuyNow()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  titleBlock: {
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.black,
  },
  priceSection: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  errorBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.black,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.ctaPrimary,
  },
  retryText: {
    ...typography.button,
    color: colors.white,
    fontWeight: "700",
  },
});
