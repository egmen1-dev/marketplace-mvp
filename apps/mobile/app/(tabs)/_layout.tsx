import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { TabBarIcon, type TabIconName } from "../../src/components/ui";
import { useAppStore } from "../../src/store/app-store";
import { colors, layout } from "../../src/theme/tokens";

function tabIcon(name: TabIconName) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <TabBarIcon name={name} color={color} focused={focused} size={size} />
  );
}

export default function TabsLayout() {
  const mode = useAppStore((s) => s.mode);
  const isSeller = mode === "seller";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: { height: layout.tabBarHeight, paddingTop: 4, paddingBottom: 6 },
        headerStyle: { backgroundColor: colors.white },
        sceneStyle: { backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная", tabBarIcon: tabIcon("home"), href: isSeller ? null : undefined }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", tabBarIcon: tabIcon("catalog"), href: isSeller ? null : undefined }} />
      <Tabs.Screen name="favorites" options={{ title: "Избранное", tabBarIcon: tabIcon("favorites"), href: isSeller ? null : undefined }} />
      <Tabs.Screen name="orders" options={{ title: "Заказы", tabBarIcon: tabIcon("orders"), href: isSeller ? null : undefined }} />
      <Tabs.Screen name="seller-home" options={{ title: "Главная", tabBarIcon: tabIcon("seller-home"), href: isSeller ? undefined : null }} />
      <Tabs.Screen name="seller-products" options={{ title: "Товары", tabBarIcon: tabIcon("seller-products"), href: isSeller ? undefined : null }} />
      <Tabs.Screen name="seller-sales" options={{ title: "Продажи", tabBarIcon: tabIcon("seller-sales"), href: isSeller ? undefined : null }} />
      <Tabs.Screen name="wallet" options={{ title: "Кошелёк", tabBarIcon: tabIcon("wallet"), href: isSeller ? undefined : null }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль", tabBarIcon: tabIcon("profile") }} />
    </Tabs>
  );
}
