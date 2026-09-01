import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, typography } from "../theme/tokens";
import { HOME_CATEGORY_SHORTCUTS } from "./content";
import { HOME_CATEGORY_CIRCLE, HOME_SCREEN_PADDING } from "./constants";
import { buildHomeCategoryCatalogRoute } from "./resolveHomeCategoryRoute";

type HomeCategoryRowProps = {
  activeId?: string | null;
  categories: Array<{ id: string; name: string; slug?: string }>;
};

export function HomeCategoryRow({ activeId = "all", categories }: HomeCategoryRowProps) {
  function onPress(shortcutId: string) {
    if (shortcutId === "all" || shortcutId === "more") {
      router.push("/(tabs)/catalog");
      return;
    }
    router.push(
      buildHomeCategoryCatalogRoute(shortcutId as "electronics" | "home" | "transport" | "clothing", categories),
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {HOME_CATEGORY_SHORTCUTS.map((item) => {
        const active = activeId === item.id;
        const iconName = active ? item.activeIcon : item.icon;
        return (
          <Pressable
            key={item.id}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onPress(item.id)}
          >
            <View style={[styles.circle, active ? styles.circleActive : styles.circleInactive]}>
              <MaterialCommunityIcons
                name={iconName}
                size={22}
                color={active ? colors.ctaPrimary : "#4A4A4A"}
              />
            </View>
            <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: HOME_SCREEN_PADDING,
    gap: 12,
    paddingVertical: 2,
  },
  item: {
    width: 64,
    alignItems: "center",
    gap: 7,
  },
  circle: {
    width: HOME_CATEGORY_CIRCLE,
    height: HOME_CATEGORY_CIRCLE,
    borderRadius: HOME_CATEGORY_CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  circleActive: {
    borderColor: colors.ctaPrimary,
    backgroundColor: colors.white,
  },
  circleInactive: {
    borderColor: "#E9E9E9",
    backgroundColor: colors.white,
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    color: colors.black,
    fontWeight: "500",
    textAlign: "center",
  },
  labelActive: {
    color: colors.ctaPrimary,
    fontWeight: "700",
  },
});
