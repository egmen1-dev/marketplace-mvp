import { Image } from "expo-image";
import { useRef, useState } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View, type ListRenderItem } from "react-native";

import { ProductImageFallback } from "../../components/ui";
import { colors, radii, spacing } from "../../theme/tokens";
import { PRODUCT_GALLERY_HEIGHT, PRODUCT_GALLERY_RADIUS, PRODUCT_GALLERY_WIDTH, PRODUCT_SCREEN_PADDING } from "./constants";

type GalleryImage = { url: string };

function Dot({ active }: { active: boolean }) {
  return <View style={[styles.dot, active ? styles.dotActive : null]} />;
}

export function ProductGallery({
  images,
  resolveUrl,
  discountPercent,
  showHitBadge,
}: {
  images: GalleryImage[];
  resolveUrl: (url: string) => string | null;
  discountPercent: number | null;
  showHitBadge?: boolean;
}) {
  const listRef = useRef<FlatList<GalleryImage>>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / PRODUCT_GALLERY_WIDTH);
    if (next !== index && next >= 0 && next < count) setIndex(next);
  };

  const renderItem: ListRenderItem<GalleryImage> = ({ item }) => {
    const uri = resolveUrl(item.url);
    return (
      <View style={styles.slide}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} contentFit="contain" transition={200} />
        ) : (
          <ProductImageFallback />
        )}
      </View>
    );
  };

  if (count === 0) {
    return (
      <View style={styles.wrap}>
        <View style={styles.surface}>
          <ProductImageFallback />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.surface}>
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(item, idx) => `${item.url}-${idx}`}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={count > 1}
          getItemLayout={(_, i) => ({ length: PRODUCT_GALLERY_WIDTH, offset: PRODUCT_GALLERY_WIDTH * i, index: i })}
        />

        {discountPercent ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        ) : null}

        {showHitBadge ? (
          <View style={[styles.hitBadge, discountPercent ? styles.hitBadgeBelowDiscount : null]}>
            <Text style={styles.hitText}>Хит продаж</Text>
          </View>
        ) : null}

        {count > 1 ? (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {index + 1} / {count}
            </Text>
          </View>
        ) : null}
      </View>

      {count > 1 ? (
        <View style={styles.dots}>
          {images.map((img, idx) => (
            <Dot key={`${img.url}-${idx}`} active={idx === index} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: PRODUCT_SCREEN_PADDING,
    gap: 8,
  },
  surface: {
    width: PRODUCT_GALLERY_WIDTH,
    height: PRODUCT_GALLERY_HEIGHT,
    borderRadius: PRODUCT_GALLERY_RADIUS,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
    position: "relative",
  },
  slide: {
    width: PRODUCT_GALLERY_WIDTH,
    height: PRODUCT_GALLERY_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    minHeight: 26,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  discountText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.white,
  },
  hitBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    minHeight: 26,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  hitBadgeBelowDiscount: {
    top: spacing.md + 32,
  },
  hitText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.ctaPrimary,
  },
  counter: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: "rgba(17,17,17,0.55)",
  },
  counterText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.white,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D9D9D9",
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ctaPrimary,
  },
});
