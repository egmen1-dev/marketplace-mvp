import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { CategoryItem } from "../../features/catalog-discovery/useCatalogDiscovery";

export function CatalogCategoryRail({
  categories,
  activeId,
  onSelect,
}: {
  categories: CategoryItem[];
  activeId?: string | null;
  onSelect: (category: CategoryItem | null) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !activeId }}
        onPress={() => onSelect(null)}
        style={[styles.chip, !activeId ? styles.chipActive : null]}
      >
        <Text style={[styles.label, !activeId ? styles.labelActive : null]}>Все категории</Text>
      </Pressable>
      {categories.map((cat) => {
        const active = activeId === cat.id;
        return (
          <Pressable
            key={cat.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(cat)}
            style={[styles.chip, active ? styles.chipActive : null]}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    maxWidth: 160,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: surface.backgroundMuted,
    backgroundColor: surface.background,
    minHeight: 36,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: brand.primarySoft, borderColor: brand.primary },
  label: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  labelActive: { color: brand.primary },
});
