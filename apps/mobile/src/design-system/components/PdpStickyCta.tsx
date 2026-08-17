import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryCTA } from "./PrimaryCTA";
import { IconButton } from "./IconButton";
import { border, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  bottomInset: number;
  inStock: boolean;
  adding: boolean;
  success: boolean;
  message?: string | null;
  isFavorite: boolean;
  favoriteBusy: boolean;
  onAddToCart: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
};

export const PdpStickyCta = memo(function PdpStickyCta({
  bottomInset,
  inStock,
  adding,
  success,
  message,
  isFavorite,
  favoriteBusy,
  onAddToCart,
  onToggleFavorite,
  onShare,
}: Props) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, spacing.md) }]} accessibilityRole="toolbar">
      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
      <View style={styles.row}>
        <IconButton
          accessibilityLabel={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
          variant="muted"
          disabled={favoriteBusy}
          onPress={onToggleFavorite}
        >
          <MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} size={22} color={isFavorite ? "#DC2626" : text.primary} />
        </IconButton>
        <IconButton accessibilityLabel="Поделиться товаром" variant="muted" onPress={onShare}>
          <MaterialCommunityIcons name="share-variant-outline" size={22} color={text.primary} />
        </IconButton>
        <View style={styles.ctaWrap}>
          <PrimaryCTA
            label="Добавить в корзину"
            fullWidth
            disabled={!inStock}
            loading={adding}
            success={success}
            onPress={onAddToCart}
            accessibilityLabel={inStock ? "Добавить в корзину" : "Товар недоступен"}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: border.default,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ctaWrap: { flex: 1, minHeight: layout.buttonHeightLg },
  message: { ...typography.caption, color: text.secondary, textAlign: "center" },
});
