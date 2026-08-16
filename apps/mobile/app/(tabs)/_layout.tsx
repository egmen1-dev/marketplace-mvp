import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBarBadge, TabBarIcon, type TabIconName } from "../../src/components/ui";
import { useTabBadges } from "../../src/hooks/useTabBadges";
import { useAppStore } from "../../src/store/app-store";
import { colors } from "../../src/theme/tokens";

function tabIcon(name: TabIconName, badge?: number) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <TabBarBadge count={badge}>
      <TabBarIcon name={name} color={color} focused={focused} size={size} />
    </TabBarBadge>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const mode = useAppStore((s) => s.mode);
  const badges = useAppStore((s) => s.badges);
  const isSeller = mode === "seller";
  useTabBadges();

  const tabBarHeight = 56 + Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: colors.gray200,
          backgroundColor: colors.white,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        headerStyle: { backgroundColor: colors.white },
        sceneStyle: { backgroundColor: colors.white },
        animation: "fade",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная", tabBarIcon: tabIcon("home"), href: isSeller ? null : undefined }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", tabBarIcon: tabIcon("catalog"), href: isSeller ? null : undefined }} />
      <Tabs.Screen
        name="favorites"
        options={{ title: "Избранное", tabBarIcon: tabIcon("favorites", badges.favorites), href: isSeller ? null : undefined }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Заказы", tabBarIcon: tabIcon("orders", badges.orders), href: isSeller ? null : undefined }}
      />
      <Tabs.Screen name="seller-home" options={{ title: "Главная", tabBarIcon: tabIcon("seller-home"), href: isSeller ? undefined : null }} />
      <Tabs.Screen name="seller-products" options={{ title: "Товары", tabBarIcon: tabIcon("seller-products"), href: isSeller ? undefined : null }} />
      <Tabs.Screen name="seller-sales" options={{ title: "Продажи", tabBarIcon: tabIcon("seller-sales"), href: isSeller ? undefined : null }} />
      <Tabs.Screen name="wallet" options={{ title: "Кошелёк", tabBarIcon: tabIcon("wallet"), href: isSeller ? undefined : null }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль", tabBarIcon: tabIcon("profile") }} />
    </Tabs>
  );
}
