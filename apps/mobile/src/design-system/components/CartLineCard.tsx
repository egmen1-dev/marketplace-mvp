import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { memo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { QuantityStepper } from "./QuantityStepper";
import { IconButton } from "./IconButton";
import type { CartLineView } from "../../features/cart-checkout/types";
import { formatPrice } from "../../utils/format";
import { brand, border, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  line: CartLineView;
  currency?: string;
  isFavorite?: boolean;
  favoriteBusy?: boolean;
  onOpenProduct: () => void;
  onToggleFavorite: () => void;
  onRemove: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
};

export const CartLineCard = memo(function CartLineCard({
  line,
  currency = "₽",
  isFavorite,
  favoriteBusy,
  onOpenProduct,
  onToggleFavorite,
  onRemove,
  onDecrement,
  onIncrement,
}: Props) {
  const hasCompare = Boolean(line.compareAt && line.compareAt > line.price);

  return (
    <Animated.View style={[styles.card, line.removing ? styles.removing : null]}>
      <Pressable
        style={styles.mainPress}
        onPress={onOpenProduct}
        accessibilityRole="button"
        accessibilityLabel={`Открыть ${line.title}`}
      >
        <View style={styles.imageWrap}>
          {line.imageUrl ? (
            <Image source={{ uri: line.imageUrl }} style={styles.image} contentFit="cover" transition={180} cachePolicy="memory-disk" />
          ) : (
            <View style={styles.imageFallback}>
              <MaterialCommunityIcons name="shopping-outline" size={28} color={brand.primary} />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {line.title}
          </Text>
          {line.sellerName ? (
            <Text style={styles.seller} numberOfLines={1}>
              {line.sellerName}
            </Text>
          ) : null}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(line.price, currency)}</Text>
            {hasCompare ? <Text style={styles.compareAt}>{formatPrice(line.compareAt, currency)}</Text> : null}
          </View>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <QuantityStepper
          value={line.quantity}
          max={Math.max(line.stock, line.quantity)}
          busy={line.qtyBusy}
          onDecrement={onDecrement}
          onIncrement={onIncrement}
        />
        <View style={styles.iconRow}>
          <IconButton
            accessibilityLabel={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
            variant="muted"
            disabled={favoriteBusy}
            onPress={onToggleFavorite}
          >
            <MaterialCommunityIcons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? semantic.danger : text.primary}
            />
          </IconButton>
          <IconButton accessibilityLabel="Удалить из корзины" variant="muted" onPress={onRemove}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={semantic.danger} />
          </IconButton>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: border.default,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  removing: { opacity: 0.35 },
  mainPress: { flexDirection: "row", gap: spacing.md },
  imageWrap: { width: 88, height: 88, borderRadius: radii.lg, overflow: "hidden", backgroundColor: surface.backgroundMuted },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: spacing.xs },
  title: { ...typography.body, color: text.primary, fontWeight: "600" },
  seller: { ...typography.caption, color: text.muted },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  price: { ...typography.subtitle, color: brand.primary, fontWeight: "800" },
  compareAt: { ...typography.caption, color: text.discount, textDecorationLine: "line-through" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  iconRow: { flexDirection: "row", gap: spacing.xs },
});
