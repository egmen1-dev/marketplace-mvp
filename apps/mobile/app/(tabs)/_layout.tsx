import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";
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

function tabBarButton(testID: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { style, onPress, onLongPress, accessibilityState, children } = props;
    return (
      <Pressable
        testID={testID}
        accessibilityLabel={testID}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        onPress={onPress ?? undefined}
        onLongPress={onLongPress ?? undefined}
        style={style as StyleProp<ViewStyle>}
      >
        {children}
      </Pressable>
    );
  };
}

function sellTabIcon() {
  return () => (
    <View style={styles.sellFab}>
      <MaterialCommunityIcons name="plus" size={26} color={colors.white} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const badges = useAppStore((s) => s.badges);
  useTabBadges();
  useMessagesBadge();

  const tabBarHeight = 62 + Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ctaPrimary,
        tabBarInactiveTintColor: "#8A8A8A",
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: "#E9E9E9",
          borderTopWidth: 1,
          backgroundColor: colors.white,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        headerStyle: { backgroundColor: colors.white },
        sceneStyle: { backgroundColor: colors.white },
        animation: "fade",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Главная",
          headerShown: false,
          tabBarIcon: tabIcon("home"),
          tabBarButton: tabBarButton("tab-home"),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Каталог",
          headerShown: false,
          tabBarIcon: tabIcon("catalog"),
          tabBarButton: tabBarButton("tab-catalog"),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Продать",
          tabBarIcon: sellTabIcon(),
          tabBarButton: tabBarButton("tab-sell"),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Избранное",
          tabBarIcon: tabIcon("favorites"),
          tabBarButton: tabBarButton("tab-favorites"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Профиль",
          tabBarIcon: tabIcon("profile"),
          tabBarButton: tabBarButton("tab-profile"),
        }}
      />

      <Tabs.Screen name="orders" options={{ href: null, title: "Заказы" }} />
      <Tabs.Screen name="seller-home" options={{ href: null, title: "Панель продавца" }} />
      <Tabs.Screen name="seller-products" options={{ href: null, title: "Мои ЛОТы" }} />
      <Tabs.Screen name="seller-sales" options={{ href: null, title: "Продажи" }} />
      <Tabs.Screen name="wallet" options={{ href: null, title: "Кошелёк" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sellFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -18,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.ctaPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
});
