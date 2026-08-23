import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../theme/tokens";

type MenuItem = {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
};

function ProfileMenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <Pressable
            key={item.id}
            style={[styles.row, index < items.length - 1 ? styles.rowBorder : null]}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <MaterialCommunityIcons name={item.icon} size={20} color={colors.gray700} />
            <Text style={styles.rowText}>{item.label}</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ProfileMenu({
  sellerCapable,
  onPersonalData,
  onFeedback,
  onSupport,
  onAbout,
  footer,
}: {
  sellerCapable: boolean;
  onPersonalData: () => void;
  onFeedback: () => void;
  onSupport: () => void;
  onAbout: () => void;
  footer?: ReactNode;
}) {
  const purchases: MenuItem[] = [
    { id: "orders", label: "Заказы", icon: "package-variant-closed", onPress: () => router.push("/(tabs)/orders") },
    { id: "favorites", label: "Избранное", icon: "heart-outline", onPress: () => router.push("/(tabs)/favorites") },
  ];

  const sales: MenuItem[] = sellerCapable
    ? [
        { id: "products", label: "Мои товары", icon: "tag-outline", onPress: () => router.push("/(tabs)/seller-products") },
        { id: "sales", label: "Продажи", icon: "chart-line", onPress: () => router.push("/(tabs)/seller-sales") },
        { id: "inventory", label: "Остатки", icon: "cube-outline", onPress: () => router.push("/(tabs)/seller-products") },
        { id: "promotion", label: "Продвижение", icon: "bullhorn-outline", onPress: () => router.push("/(tabs)/seller-home") },
      ]
    : [];

  const finance: MenuItem[] = sellerCapable
    ? [{ id: "wallet", label: "Кошелёк", icon: "wallet-outline", onPress: () => router.push("/(tabs)/wallet") }]
    : [];

  const support: MenuItem[] = [
    { id: "feedback", label: "Центр обратной связи", icon: "message-text-outline", onPress: onFeedback },
    { id: "help", label: "Помощь", icon: "lifebuoy", onPress: onSupport },
  ];

  const app: MenuItem[] = [
    { id: "personal", label: "Личные данные", icon: "account-outline", onPress: onPersonalData },
    { id: "about", label: "О приложении", icon: "information-outline", onPress: onAbout },
  ];

  return (
    <View style={styles.wrap}>
      <ProfileMenuSection title="Покупки" items={purchases} />
      {sales.length > 0 ? <ProfileMenuSection title="Продажи" items={sales} /> : null}
      {finance.length > 0 ? <ProfileMenuSection title="Финансы" items={finance} /> : null}
      <ProfileMenuSection title="Поддержка" items={support} />
      <ProfileMenuSection title="Приложение" items={app} />
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: colors.gray500, fontWeight: "700", textTransform: "uppercase" },
  card: { backgroundColor: colors.gray100, borderRadius: radii.lg, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  rowText: { ...typography.body, color: colors.black, flex: 1 },
  rowChevron: { ...typography.h2, color: colors.gray500 },
});
