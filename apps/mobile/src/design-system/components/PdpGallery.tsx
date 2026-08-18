import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { memo, useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";

import { loadAppConfig } from "../../config/env";
import { resolveImageUrl } from "../../utils/format";
import { brand, surface, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { ProductImage } from "../../features/product-detail/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GALLERY_HEIGHT = SCREEN_WIDTH;

type Props = {
  images: ProductImage[];
  discount?: number | null;
};

export const PdpGallery = memo(function PdpGallery({ images, discount }: Props) {
  const config = loadAppConfig();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<ProductImage>>(null);

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(next);
  }, []);

  const renderItem: ListRenderItem<ProductImage> = useCallback(
    ({ item }) => {
      const uri = resolveImageUrl(item.url, config.apiBaseUrl);
      return (
        <View style={styles.slide}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.image}
              contentFit="cover"
              transition={220}
              cachePolicy="memory-disk"
              accessibilityLabel={item.alt ?? "Фото товара"}
            />
          ) : (
            <GalleryPlaceholder />
          )}
        </View>
      );
    },
    [config.apiBaseUrl],
  );

  if (images.length === 0) {
    return (
      <View style={styles.wrap}>
        <GalleryPlaceholder />
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={`Галерея товара, фото ${index + 1} из ${images.length}`}>
      <FlatList
        ref={listRef}
        data={images}
        horizontal
        pagingEnabled
        bounces={images.length > 1}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, idx) => `${item.url}-${idx}`}
        renderItem={renderItem}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, idx) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * idx, index: idx })}
      />
      {discount ? (
        <View style={styles.discountBadge} accessibilityLabel={`Скидка ${discount} процентов`}>
          <Text style={styles.discountText}>-{discount}%</Text>
        </View>
      ) : null}
      {images.length > 1 ? (
        <View style={styles.indicatorRow} accessibilityLabel={`Индикатор ${index + 1} из ${images.length}`}>
          {images.map((img, idx) => (
            <View key={`${img.url}-dot-${idx}`} style={[styles.dot, idx === index ? styles.dotActive : null]} />
          ))}
        </View>
      ) : null}
    </View>
  );
});

function GalleryPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <MaterialCommunityIcons name="image-outline" size={36} color={brand.primary} />
      <Text style={styles.placeholderText}>ЛОТ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: surface.backgroundMuted, position: "relative" },
  slide: { width: SCREEN_WIDTH, height: GALLERY_HEIGHT },
  image: { width: SCREEN_WIDTH, height: GALLERY_HEIGHT },
  placeholder: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: surface.backgroundMuted,
  },
  placeholderText: { ...typography.h2, color: brand.primary },
  discountBadge: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    backgroundColor: brand.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  discountText: { ...typography.badge, color: text.inverse, fontWeight: "700" },
  indicatorRow: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.35)",
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  dotActive: { backgroundColor: text.inverse, width: 16 },
});

export const PdpGallerySkeleton = memo(function PdpGallerySkeleton() {
  return <View style={{ width: SCREEN_WIDTH, height: GALLERY_HEIGHT, backgroundColor: surface.backgroundMuted }} />;
});
