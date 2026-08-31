import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../../theme/tokens";
import { CHECKOUT_SCREEN_PADDING } from "./constants";

export function CheckoutHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Назад" hitSlop={8}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.black} />
      </Pressable>

      <Pressable
        style={styles.brand}
        onPress={() => router.push("/(tabs)")}
        accessibilityRole="button"
        accessibilityLabel="LOT — на главную"
      >
        <Text style={styles.brandText}>LOT</Text>
      </Pressable>

      <View style={styles.sideSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: CHECKOUT_SCREEN_PADDING,
    paddingBottom: 10,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sideSpacer: {
    width: 40,
    height: 40,
  },
  brand: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
  },
  brandText: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.ctaPrimary,
    letterSpacing: 1,
  },
});
