import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppStore } from "../store/app-store";
import { colors, spacing, typography } from "../theme/tokens";
import { HOME_LOCATION_LABEL } from "./content";
import { HOME_SCREEN_PADDING } from "./constants";

function HeaderIconButton({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.iconBtn} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.black} />
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function HomeHeader() {
  const insets = useSafeAreaInsets();
  const badges = useAppStore((s) => s.badges);

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <View style={styles.side}>
        <View style={styles.location} accessibilityRole="text" accessibilityLabel={`Город: ${HOME_LOCATION_LABEL}`}>
          <MaterialCommunityIcons name="map-marker-outline" size={17} color={colors.black} />
          <Text style={styles.locationText}>{HOME_LOCATION_LABEL}</Text>
        </View>
      </View>

      <Pressable
        style={styles.brand}
        onPress={() => router.push("/(tabs)")}
        accessibilityRole="button"
        accessibilityLabel="LOT — на главную"
      >
        <Text style={styles.brandText}>LOT</Text>
      </Pressable>

      <View style={[styles.side, styles.sideRight]}>
        <HeaderIconButton icon="bell-outline" label="Уведомления" badge={badges.messages} onPress={() => router.push("/messages")} />
        <HeaderIconButton icon="cart-outline" label="Корзина" badge={badges.cart} onPress={() => router.push("/cart")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HOME_SCREEN_PADDING,
    paddingBottom: 10,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  sideRight: {
    justifyContent: "flex-end",
    gap: 2,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 0,
  },
  locationText: {
    ...typography.caption,
    color: colors.black,
    fontWeight: "600",
    fontSize: 14,
    maxWidth: 104,
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
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
});
