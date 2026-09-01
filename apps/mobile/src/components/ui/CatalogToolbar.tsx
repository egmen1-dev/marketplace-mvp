import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";
import { Chip } from "./Chip";

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
  dealsOnly,
  onDealsChange,
  categoryName,
  onClearCategory,
  onResetFilters,
}: {
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  dealsOnly?: boolean;
  onDealsChange?: (value: boolean) => void;
  categoryName?: string | null;
  onClearCategory?: () => void;
  onResetFilters?: () => void;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "Популярные";
  const activeFilterCount = [inStockOnly, dealsOnly, Boolean(categoryName)].filter(Boolean).length;

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (inStockOnly) parts.push("В наличии");
    if (dealsOnly) parts.push("Скидки");
    if (categoryName) parts.push(categoryName);
    return parts.join(" · ");
  }, [categoryName, dealsOnly, inStockOnly]);

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Pressable style={styles.sortButton} onPress={() => setSortOpen(true)} accessibilityRole="button" accessibilityLabel={`Сортировка: ${sortLabel}`}>
          <Text style={styles.sortLabel}>Сортировка:</Text>
          <Text style={styles.sortValue} numberOfLines={1}>
            {sortLabel}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.gray700} />
        </Pressable>

        <Pressable style={styles.filterButton} onPress={() => setFiltersOpen(true)} accessibilityRole="button" accessibilityLabel="Фильтры">
          <MaterialCommunityIcons name="tune-variant" size={18} color={colors.gray900} />
          <Text style={styles.filterText}>Фильтры</Text>
          {activeFilterCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {filterSummary ? (
        <Pressable onPress={onResetFilters ?? onClearCategory} accessibilityRole="button" accessibilityLabel="Сбросить фильтры">
          <Text style={styles.activeFilters} numberOfLines={1}>
            {filterSummary} · сбросить
          </Text>
        </Pressable>
      ) : null}

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Сортировка</Text>
            {SORT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={styles.sheetRow}
                onPress={() => {
                  onSortChange(opt.id);
                  setSortOpen(false);
                }}
              >
                <Text style={[styles.sheetRowText, sort === opt.id ? styles.sheetRowActive : null]}>{opt.label}</Text>
                {sort === opt.id ? <MaterialCommunityIcons name="check" size={18} color={colors.orange} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={filtersOpen} transparent animationType="fade" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFiltersOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Фильтры</Text>
            <View style={styles.filterChips}>
              <Chip label="В наличии" active={inStockOnly} onPress={() => onInStockChange(!inStockOnly)} />
              {onDealsChange ? <Chip label="Скидки" active={Boolean(dealsOnly)} onPress={() => onDealsChange(!dealsOnly)} /> : null}
            </View>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                onResetFilters?.();
                setFiltersOpen(false);
              }}
            >
              <Text style={styles.sheetRowText}>Сбросить все фильтры</Text>
            </Pressable>
            {categoryName ? (
              <Pressable style={styles.sheetRow} onPress={() => { onClearCategory?.(); setFiltersOpen(false); }}>
                <Text style={styles.sheetRowText}>Сбросить категорию: {categoryName}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.sheetDone} onPress={() => setFiltersOpen(false)}>
              <Text style={styles.sheetDoneText}>Готово</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      <Chip label="Все" active={!activeId} variant="category" onPress={() => onSelect(null)} />
      {categories.map((cat) => (
        <Chip key={cat.id} label={cat.name} active={activeId === cat.id} variant="category" onPress={() => onSelect(cat)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sortButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  sortLabel: { ...typography.caption, color: colors.gray500 },
  sortValue: { ...typography.caption, color: colors.black, fontWeight: "700", flexShrink: 1 },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  filterText: { ...typography.caption, color: colors.gray900, fontWeight: "600" },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.white },
  activeFilters: { ...typography.caption, color: colors.orange, fontWeight: "600" },
  rail: { gap: spacing.sm, paddingVertical: 2, alignItems: "center", flexGrow: 0 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: { ...typography.h2, marginBottom: spacing.xs },
  sheetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md },
  sheetRowText: { ...typography.body, color: colors.gray900 },
  sheetRowActive: { color: colors.orange, fontWeight: "700" },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sheetDone: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDoneText: { ...typography.button, color: colors.white },
});
