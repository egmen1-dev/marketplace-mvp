import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatPrice } from "../../utils/format";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { PRODUCT_SCREEN_PADDING, STICKY_BAR_HEIGHT } from "./constants";

export function ProductStickyPurchaseBar({
  price,
  quantity,
  inStock,
  buyNowLoading,
  cartBusy,
  onAddToCart,
  onIncrement,
  onDecrement,
  onBuyNow,
}: {
  price: number;
  quantity: number;
  inStock: boolean;
  buyNowLoading?: boolean;
  cartBusy?: boolean;
  onAddToCart: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onBuyNow: () => void;
}) {
  const insets = useSafeAreaInsets();
  const cartDisabled = Boolean(cartBusy);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {!inStock ? (
        <View style={styles.unavailable}>
          <Text style={styles.unavailableText}>Нет в наличии</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          {quantity <= 0 ? (
            <Pressable
              style={[styles.cartBtn, cartDisabled ? styles.disabled : null]}
              onPress={onAddToCart}
              disabled={cartDisabled}
              accessibilityRole="button"
              accessibilityLabel="В корзину"
            >
              {cartDisabled ? (
                <ActivityIndicator size="small" color={colors.ctaPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="cart-outline" size={20} color={colors.ctaPrimary} />
                  <Text style={styles.cartText}>В корзину</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={[styles.stepper, cartDisabled ? styles.disabled : null]}>
              <Pressable style={styles.stepBtn} onPress={onDecrement} disabled={cartDisabled} accessibilityRole="button" hitSlop={6}>
                <Text style={styles.stepSymbol}>−</Text>
              </Pressable>
              {cartDisabled ? (
                <ActivityIndicator size="small" color={colors.ctaPrimary} />
              ) : (
                <Text style={styles.qty}>{quantity}</Text>
              )}
              <Pressable style={styles.stepBtn} onPress={onIncrement} disabled={cartDisabled} accessibilityRole="button" hitSlop={6}>
                <Text style={styles.stepSymbol}>+</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.buyBtn, buyNowLoading ? styles.buyBtnDisabled : null]}
            onPress={onBuyNow}
            disabled={buyNowLoading}
            accessibilityRole="button"
            accessibilityLabel="Купить сейчас"
          >
            <Text style={styles.buyTitle}>{buyNowLoading ? "Оформление…" : "Купить сейчас"}</Text>
            <Text style={styles.buyPrice}>{formatPrice(price)}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function stickyBarContentInset(insetsBottom: number): number {
  return STICKY_BAR_HEIGHT + Math.max(insetsBottom, spacing.md) + spacing.lg;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: "#E9E9EC",
    paddingHorizontal: PRODUCT_SCREEN_PADDING,
    paddingTop: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    minHeight: STICKY_BAR_HEIGHT,
  },
  cartBtn: {
    flex: 0.44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.ctaPrimary,
    backgroundColor: colors.white,
    minHeight: STICKY_BAR_HEIGHT,
  },
  cartText: {
    ...typography.button,
    color: colors.ctaPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  stepper: {
    flex: 0.44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.ctaPrimary,
    backgroundColor: colors.orangeSoft,
    overflow: "hidden",
    minHeight: STICKY_BAR_HEIGHT,
  },
  stepBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    minHeight: STICKY_BAR_HEIGHT,
  },
  stepSymbol: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "600",
    color: colors.ctaPrimary,
  },
  qty: {
    ...typography.button,
    color: colors.black,
    minWidth: 28,
    textAlign: "center",
    fontWeight: "700",
  },
  buyBtn: {
    flex: 0.56,
    borderRadius: 15,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    minHeight: STICKY_BAR_HEIGHT,
    gap: 2,
  },
  buyBtnDisabled: {
    opacity: 0.7,
  },
  buyTitle: {
    ...typography.button,
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  buyPrice: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.white,
    opacity: 0.95,
  },
  unavailable: {
    minHeight: STICKY_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: "#F7F7F8",
  },
  unavailableText: {
    ...typography.button,
    color: colors.gray500,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.65,
  },
});
