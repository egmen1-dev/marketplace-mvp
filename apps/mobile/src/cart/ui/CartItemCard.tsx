import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatPrice } from "../../utils/format";
import { colors, radii, typography } from "../../theme/tokens";
import { CartPriceBlock } from "./CartPriceBlock";
import { CartProductImage } from "./CartProductImage";
import { CartQuantityStepper } from "./CartQuantityStepper";
import { CART_BORDER, CART_SCREEN_PADDING } from "./constants";

export type CartLineView = {
  productId: string;
  quantity: number;
  title: string;
  price: number;
  compareAt?: number | null;
  lineTotal: number;
  imageUrl: string | null;
  available: boolean;
  stock: number;
};

export function CartItemCard({
  item,
  isFavorite,
  onPress,
  onToggleFavorite,
  onRemove,
  onIncrement,
  onDecrement,
  busy,
}: {
  item: CartLineView;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  onRemove: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  busy?: boolean;
}) {
  const savingPerUnit =
    item.compareAt != null && item.compareAt > item.price ? item.compareAt - item.price : 0;
  const savingTotal = savingPerUnit > 0 ? savingPerUnit * item.quantity : 0;

  return (
    <View style={[styles.row, !item.available ? styles.unavailable : null]}>
      <Pressable style={styles.topRow} onPress={onPress} accessibilityRole="button">
        <CartProductImage uri={item.imageUrl} />

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {item.available ? (
            <Text style={styles.inStock}>В наличии</Text>
          ) : (
            <Text style={styles.outOfStock}>Нет в наличии</Text>
          )}

          <CartPriceBlock
            price={item.price}
            compareAt={item.compareAt}
            savingTotal={savingTotal}
            muted={!item.available}
          />
        </View>

        <Pressable
          style={styles.favoriteBtn}
          onPress={onToggleFavorite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
        >
          <MaterialCommunityIcons
            name={isFavorite ? "heart" : "heart-outline"}
            size={20}
            color={isFavorite ? colors.danger : colors.black}
          />
        </Pressable>
      </Pressable>

      <View style={styles.bottomRow}>
        <Pressable style={styles.removeBtn} onPress={onRemove} disabled={busy} accessibilityRole="button" accessibilityLabel="Удалить">
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.gray500} />
        </Pressable>

        <CartQuantityStepper
          quantity={item.quantity}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          disabled={busy || !item.available}
          max={item.stock > 0 ? item.stock : undefined}
        />

        <Text style={[styles.lineTotal, !item.available ? styles.mutedText : null]}>{formatPrice(item.lineTotal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: CART_SCREEN_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: CART_BORDER,
    gap: 12,
  },
  unavailable: {
    opacity: 0.72,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  content: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingRight: 28,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.black,
  },
  inStock: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.success,
  },
  outOfStock: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.gray500,
  },
  favoriteBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  removeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  lineTotal: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    color: colors.black,
    minWidth: 88,
    textAlign: "right",
  },
  mutedText: {
    color: colors.gray500,
  },
});
