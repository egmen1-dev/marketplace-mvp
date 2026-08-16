import { Tabs } from "expo-router";

import { useAppStore } from "../../src/store/app-store";
import { colors } from "../../src/theme/tokens";

export default function TabsLayout() {
  const mode = useAppStore((s) => s.mode);
  const isSeller = mode === "seller";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.gray500,
        headerStyle: { backgroundColor: colors.white },
        sceneStyle: { backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная", href: isSeller ? null : undefined }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", href: isSeller ? null : undefined }} />
      <Tabs.Screen name="favorites" options={{ title: "Избранное", href: isSeller ? null : undefined }} />
      <Tabs.Screen name="orders" options={{ title: "Заказы", href: isSeller ? null : undefined }} />
      <Tabs.Screen name="seller-home" options={{ title: "Главная", href: isSeller ? undefined : null }} />
      <Tabs.Screen name="seller-products" options={{ title: "Товары", href: isSeller ? undefined : null }} />
      <Tabs.Screen name="seller-sales" options={{ title: "Продажи", href: isSeller ? undefined : null }} />
      <Tabs.Screen name="wallet" options={{ title: "Кошелёк", href: isSeller ? undefined : null }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль" }} />
    </Tabs>
  );
}
