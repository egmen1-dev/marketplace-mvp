import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { POPULAR_SEARCHES } from "../../storage/search-history";
import { colors, radii, spacing, typography } from "../../theme/tokens";

export type CatalogSort = "popular" | "newest" | "price_asc" | "price_desc";

const SORT_OPTIONS: Array<{ id: CatalogSort; label: string }> = [
  { id: "popular", label: "Популярные" },
  { id: "newest", label: "Новинки" },
  { id: "price_asc", label: "Дешевле" },
  { id: "price_desc", label: "Дороже" },
];

export function CatalogToolbar({
  sort,
  onSortChange,
  inStockOnly,
  onInStockChange,
  categoryName,
  onClearCategory,
}: {
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  categoryName?: string | null;
  onClearCategory?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {SORT_OPTIONS.map((opt) => {
          const active = sort === opt.id;
          return (
            <Pressable key={opt.id} style={[styles.chip, active ? styles.chipActive : null]} onPress={() => onSortChange(opt.id)}>
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{opt.label}</Text>
            </Pressable>
          );
        })}
        <Pressable style={[styles.chip, inStockOnly ? styles.chipActive : null]} onPress={() => onInStockChange(!inStockOnly)}>
          <MaterialCommunityIcons name="check-circle-outline" size={14} color={inStockOnly ? colors.white : colors.gray700} />
          <Text style={[styles.chipText, inStockOnly ? styles.chipTextActive : null]}>В наличии</Text>
        </Pressable>
        {categoryName ? (
          <Pressable style={[styles.chip, styles.chipActive]} onPress={onClearCategory}>
            <Text style={[styles.chipText, styles.chipTextActive]}>{categoryName} ✕</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function CategoryRail({
  categories,
  activeId,
  onSelect,
}: {
  categories: Array<{ id: string; name: string }>;
  activeId?: string | null;
  onSelect: (category: { id: string; name: string } | null) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Pressable style={[styles.catChip, !activeId ? styles.chipActive : null]} onPress={() => onSelect(null)}>
        <Text style={[styles.catText, !activeId ? styles.chipTextActive : null]}>Все</Text>
      </Pressable>
      {categories.map((cat) => {
        const active = activeId === cat.id;
        return (
          <Pressable key={cat.id} style={[styles.catChip, active ? styles.chipActive : null]} onPress={() => onSelect(cat)}>
            <Text style={[styles.catText, active ? styles.chipTextActive : null]} numberOfLines={1}>
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export { POPULAR_SEARCHES };

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    minHeight: 36,
  },
  chipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { ...typography.caption, color: colors.gray700, fontWeight: "600" },
  chipTextActive: { color: colors.white },
  catChip: {
    maxWidth: 140,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.gray100,
    minHeight: 36,
    justifyContent: "center",
  },
  catText: { ...typography.caption, color: colors.gray900, fontWeight: "600" },
});
