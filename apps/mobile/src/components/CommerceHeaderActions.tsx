import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppStore } from "../store/app-store";
import { colors, spacing } from "../theme/tokens";

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
    <Pressable
      style={styles.btn}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.black} />
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function CommerceHeaderActions() {
  const badges = useAppStore((s) => s.badges);

  return (
    <View style={styles.row}>
      <HeaderIconButton
        icon="heart-outline"
        label="Избранное"
        badge={badges.favorites}
        onPress={() => router.push("/(tabs)/favorites")}
      />
      <HeaderIconButton
        icon="cart-outline"
        label="Корзина"
        badge={badges.cart}
        onPress={() => router.push("/cart")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  btn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
});
