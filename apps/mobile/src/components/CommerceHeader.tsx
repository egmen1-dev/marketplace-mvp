import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppStore } from "../store/app-store";
import { colors, spacing, typography } from "../theme/tokens";

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
      style={styles.iconBtn}
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

type CommerceHeaderProps = {
  /** Show compact mode without subtitle row */
  compact?: boolean;
  subtitle?: string;
};

export function CommerceHeader({ compact, subtitle }: CommerceHeaderProps) {
  const insets = useSafeAreaInsets();
  const badges = useAppStore((s) => s.badges);

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <Pressable
        style={styles.brand}
        onPress={() => router.push("/(tabs)")}
        accessibilityRole="button"
        accessibilityLabel="ЛОТ — на главную"
      >
        <Text style={styles.brandText}>ЛОТ</Text>
        {!compact && subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Pressable>

      <View style={styles.actions}>
        <HeaderIconButton
          icon="magnify"
          label="Поиск"
          onPress={() => router.push({ pathname: "/(tabs)/catalog", params: { focusSearch: "1" } })}
        />
        <HeaderIconButton
          icon="message-outline"
          label="Сообщения"
          badge={badges.messages}
          onPress={() => router.push("/messages")}
        />
        <HeaderIconButton
          icon="cart-outline"
          label="Корзина"
          badge={badges.cart}
          onPress={() => router.push("/cart")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  brand: { flex: 1, gap: 2, minHeight: 44, justifyContent: "center" },
  brandText: { ...typography.h1, color: colors.orange, fontWeight: "800" },
  subtitle: { ...typography.caption, color: colors.gray500 },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
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
