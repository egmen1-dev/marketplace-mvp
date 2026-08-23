import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { openLegalPage, openSupportPage } from "../navigation/legal-links";
import { colors, radii, spacing, typography } from "../theme/tokens";

type MenuItem = {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  badge?: number;
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
            {item.badge && item.badge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge > 99 ? "99+" : item.badge}</Text>
              </View>
            ) : null}
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ProfileMenu({
  sellerCapable,
  messagesBadge = 0,
  onSupport,
  onReportError,
  onAbout,
  footer,
}: {
  sellerCapable: boolean;
  messagesBadge?: number;
  onSupport: () => void;
  onReportError: () => void;
  onAbout: () => void;
  footer?: ReactNode;
}) {
  const account: MenuItem[] = [
    { id: "favorites", label: "Избранное", icon: "heart-outline", onPress: () => router.push("/(tabs)/favorites") },
    { id: "messages", label: "Сообщения", icon: "message-outline", badge: messagesBadge, onPress: () => router.push("/messages") },
  ];

  const purchases: MenuItem[] = [
    { id: "cart", label: "Корзина", icon: "cart-outline", onPress: () => router.push("/cart") },
    { id: "orders", label: "Заказы", icon: "package-variant-closed", onPress: () => router.push("/(tabs)/orders") },
  ];

  const sales: MenuItem[] = sellerCapable
    ? [
        { id: "products", label: "Мои товары", icon: "tag-outline", onPress: () => router.push("/(tabs)/seller-products") },
        { id: "add-product", label: "Добавить товар", icon: "plus-circle-outline", onPress: () => router.push("/(tabs)/sell") },
        { id: "sales", label: "Продажи", icon: "chart-line", onPress: () => router.push("/(tabs)/seller-sales") },
        { id: "seller-home", label: "Кабинет продавца", icon: "store-outline", onPress: () => router.push("/(tabs)/seller-home") },
      ]
    : [];

  const finance: MenuItem[] = sellerCapable
    ? [
        { id: "wallet", label: "Кошелёк", icon: "wallet-outline", onPress: () => router.push("/(tabs)/wallet") },
        { id: "payouts", label: "Выплаты", icon: "cash-multiple", onPress: () => router.push("/(tabs)/wallet") },
      ]
    : [];

  const support: MenuItem[] = [
    { id: "support", label: "Поддержка", icon: "lifebuoy", onPress: onSupport },
    { id: "report", label: "Сообщить об ошибке", icon: "alert-circle-outline", onPress: onReportError },
  ];

  const app: MenuItem[] = [
    { id: "about", label: "О приложении", icon: "information-outline", onPress: onAbout },
    { id: "update", label: "Проверить обновление", icon: "update", onPress: () => router.push("/update") },
  ];

  const legal: MenuItem[] = [
    { id: "privacy", label: "Политика конфиденциальности", icon: "shield-outline", onPress: () => openLegalPage("privacy") },
    { id: "terms", label: "Пользовательское соглашение", icon: "file-document-outline", onPress: () => openLegalPage("terms") },
    { id: "about-company", label: "О нас", icon: "domain", onPress: () => openLegalPage("about") },
    { id: "contacts", label: "Контакты", icon: "phone-outline", onPress: () => openLegalPage("contacts") },
  ];

  return (
    <View style={styles.wrap}>
      <ProfileMenuSection title="Аккаунт" items={account} />
      <ProfileMenuSection title="Покупки" items={purchases} />
      {sales.length > 0 ? <ProfileMenuSection title="Продажи" items={sales} /> : null}
      {finance.length > 0 ? <ProfileMenuSection title="Финансы" items={finance} /> : null}
      <ProfileMenuSection title="Поддержка" items={support} />
      <ProfileMenuSection title="Приложение" items={app} />
      <ProfileMenuSection title="Правовая информация" items={legal} />
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: colors.gray500, fontWeight: "700", textTransform: "uppercase" },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.gray200 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  rowText: { ...typography.body, color: colors.black, flex: 1 },
  rowChevron: { ...typography.h2, color: colors.gray500 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
});
