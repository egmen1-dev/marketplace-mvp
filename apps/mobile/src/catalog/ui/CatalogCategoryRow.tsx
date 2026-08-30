import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { HOME_CATEGORY_SHORTCUTS } from "../../home/content";
import { HOME_CATEGORY_CIRCLE } from "../../home/constants";
import { colors } from "../../theme/tokens";
import { CATALOG_SCREEN_PADDING } from "./constants";

type CatalogCategoryRowProps = {
  activeCategoryId: string | null;
  categories: Array<{ id: string; name: string; slug?: string }>;
  onSelect: (category: { id: string; name: string } | null) => void;
};

function resolveShortcutId(
  categoryId: string | null,
  categories: Array<{ id: string; name: string; slug?: string }>,
): string {
  if (!categoryId) return "all";
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return "unknown";
  const slug = cat.slug ?? "";
  const name = cat.name.toLowerCase();
  if (slug === "electronics" || name.includes("электрон")) return "electronics";
  if (slug === "home" || name.includes("дом")) return "home";
  if (slug === "clothing" || name.includes("одеж")) return "clothing";
  if (slug === "auto" || slug === "transport" || name.includes("транспорт") || name.includes("авто")) return "transport";
  return "unknown";
}

function resolveCategoryId(
  shortcutId: string,
  categories: Array<{ id: string; name: string; slug?: string }>,
): string | null {
  const bySlug = new Map(categories.map((c) => [c.slug ?? c.id, c.id]));
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  if (shortcutId === "electronics") return bySlug.get("electronics") ?? byName.get("электроника") ?? null;
  if (shortcutId === "home") return bySlug.get("home") ?? byName.get("дом и сад") ?? byName.get("дом") ?? null;
  if (shortcutId === "clothing") return bySlug.get("clothing") ?? byName.get("одежда") ?? null;
  if (shortcutId === "transport") return bySlug.get("auto") ?? bySlug.get("transport") ?? byName.get("транспорт") ?? null;
  return null;
}

export function CatalogCategoryRow({ activeCategoryId, categories, onSelect }: CatalogCategoryRowProps) {
  const activeShortcut = resolveShortcutId(activeCategoryId, categories);

  function onPress(shortcutId: string) {
    if (shortcutId === "all") {
      onSelect(null);
      return;
    }
    if (shortcutId === "more") {
      onSelect(null);
      return;
    }
    const categoryId = resolveCategoryId(shortcutId, categories);
    if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId);
      if (cat) onSelect({ id: cat.id, name: cat.name });
      return;
    }
    onSelect(null);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {HOME_CATEGORY_SHORTCUTS.map((item) => {
        const active = activeShortcut === item.id;
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
              <MaterialCommunityIcons name={iconName} size={22} color={active ? colors.ctaPrimary : "#4A4A4A"} />
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
    paddingHorizontal: CATALOG_SCREEN_PADDING,
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
