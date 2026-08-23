import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBarBadge, TabBarIcon, type TabIconName } from "../../src/components/ui";
import { useMessagesBadge } from "../../src/hooks/useMessagesBadge";
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
  const badges = useAppStore((s) => s.badges);
  useTabBadges();
  useMessagesBadge();

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
      <Tabs.Screen name="index" options={{ title: "Главная", headerShown: false, tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", headerShown: false, tabBarIcon: tabIcon("catalog") }} />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Продать",
          tabBarIcon: tabIcon("sell"),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Заказы", tabBarIcon: tabIcon("orders", badges.orders) }}
      />
      <Tabs.Screen name="profile" options={{ title: "Профиль", tabBarIcon: tabIcon("profile") }} />

      <Tabs.Screen name="favorites" options={{ href: null, title: "Избранное" }} />
      <Tabs.Screen name="seller-home" options={{ href: null, title: "Панель продавца" }} />
      <Tabs.Screen name="seller-products" options={{ href: null, title: "Мои товары" }} />
      <Tabs.Screen name="seller-sales" options={{ href: null, title: "Продажи" }} />
      <Tabs.Screen name="wallet" options={{ href: null, title: "Кошелёк" }} />
    </Tabs>
  );
}
