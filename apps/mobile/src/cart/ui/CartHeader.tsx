import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HOME_LOCATION_LABEL } from "../../home/content";
import { useAppStore } from "../../store/app-store";
import { colors, spacing, typography } from "../../theme/tokens";
import { CART_SCREEN_PADDING } from "./constants";

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

export function CartHeader() {
  const insets = useSafeAreaInsets();
  const badges = useAppStore((s) => s.badges);

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <View style={styles.side}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Назад" hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.black} />
        </Pressable>
        <Pressable
          style={styles.location}
          accessibilityRole="button"
          accessibilityLabel={`Город: ${HOME_LOCATION_LABEL}`}
          onPress={() => router.push("/(tabs)/catalog")}
        >
          <MaterialCommunityIcons name="map-marker-outline" size={17} color={colors.black} />
          <Text style={styles.locationText}>{HOME_LOCATION_LABEL}</Text>
          <MaterialCommunityIcons name="chevron-down" size={15} color={colors.gray500} />
        </Pressable>
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
        <HeaderIconButton icon="heart-outline" label="Избранное" onPress={() => router.push("/(tabs)/favorites")} />
        <HeaderIconButton icon="bell-outline" label="Уведомления" badge={badges.messages} onPress={() => router.push("/messages")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: CART_SCREEN_PADDING,
    paddingBottom: 10,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 2,
  },
  sideRight: {
    justifyContent: "flex-end",
    gap: 2,
  },
  backBtn: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 0,
    flexShrink: 1,
  },
  locationText: {
    ...typography.caption,
    color: colors.black,
    fontWeight: "600",
    fontSize: 13,
    maxWidth: 88,
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
