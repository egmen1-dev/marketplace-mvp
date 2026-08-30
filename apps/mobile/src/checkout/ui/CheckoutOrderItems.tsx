import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ProductImageFallback } from "../../components/ui";
import { colors, radii, spacing } from "../../theme/tokens";
import { formatPrice } from "../../utils/format";
import { CHECKOUT_BORDER, CHECKOUT_ITEM_THUMB, CHECKOUT_SCREEN_PADDING } from "./constants";
import { formatQuantityLabel } from "./format";

export type CheckoutLineView = {
  productId: string;
  quantity: number;
  title: string;
  price: number;
  lineTotal: number;
  imageUrl: string | null;
  available: boolean;
};

export function CheckoutOrderItem({
  item,
  onPress,
}: {
  item: CheckoutLineView;
  onPress?: () => void;
}) {
  const body = (
    <>
      <View style={styles.thumb}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="contain" transition={150} />
        ) : (
          <ProductImageFallback />
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {!item.available ? <Text style={styles.unavailable}>Нет в наличии</Text> : null}
      </View>
      <View style={styles.meta}>
        <Text style={styles.qty}>{formatQuantityLabel(item.quantity)}</Text>
        <Text style={[styles.lineTotal, !item.available ? styles.muted : null]}>{formatPrice(item.lineTotal)}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }

  return <View style={styles.row}>{body}</View>;
}

export function CheckoutOrderItems({
  items,
  onItemPress,
}: {
  items: CheckoutLineView[];
  onItemPress?: (productId: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Ваш заказ</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <CheckoutOrderItem
            key={item.productId}
            item={item}
            onPress={onItemPress ? () => onItemPress(item.productId) : undefined}
          />
        ))}
        {items.length === 0 ? (
          <Text style={styles.empty}>Корзина пуста</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: CHECKOUT_SCREEN_PADDING,
    gap: spacing.md,
  },
  heading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.black,
  },
  list: {
    borderWidth: 1,
    borderColor: CHECKOUT_BORDER,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CHECKOUT_BORDER,
  },
  thumb: {
    width: CHECKOUT_ITEM_THUMB,
    height: CHECKOUT_ITEM_THUMB,
    borderRadius: radii.sm,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingTop: 2,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.black,
  },
  unavailable: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.gray500,
  },
  meta: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 72,
    paddingTop: 2,
  },
  qty: {
    fontSize: 13,
    lineHeight: 16,
    color: "#8A8A8A",
  },
  lineTotal: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
    color: colors.black,
  },
  muted: {
    color: colors.gray500,
  },
  empty: {
    padding: 16,
    fontSize: 14,
    color: "#8A8A8A",
    textAlign: "center",
  },
});
