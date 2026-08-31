import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { CatalogSort } from "../../components/ui/CatalogToolbar";
import { Chip } from "../../components/ui/Chip";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { CATALOG_SCREEN_PADDING } from "./constants";

const SORT_OPTIONS: Array<{ id: CatalogSort; label: string }> = [
  { id: "popular", label: "популярные" },
  { id: "newest", label: "новинки" },
  { id: "price_asc", label: "дешевле" },
  { id: "price_desc", label: "дороже" },
];

type CatalogFilterBarProps = {
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
  dealsOnly: boolean;
  onDealsChange: (value: boolean) => void;
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  onResetFilters?: () => void;
  categoryName?: string | null;
  onClearCategory?: () => void;
};

export function CatalogFilterBar({
  sort,
  onSortChange,
  dealsOnly,
  onDealsChange,
  inStockOnly,
  onInStockChange,
  filtersOpen,
  onFiltersOpenChange,
  onResetFilters,
  categoryName,
  onClearCategory,
}: CatalogFilterBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "популярные";
  const priceActive = sort === "price_asc" || sort === "price_desc";

  function togglePriceSort() {
    if (sort === "price_asc") onSortChange("price_desc");
    else onSortChange("price_asc");
  }

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pressable style={[styles.chip, styles.chipSort]} onPress={() => setSortOpen(true)} accessibilityRole="button">
          <Text style={styles.chipSortText}>
            Сортировка: <Text style={styles.chipSortValue}>{sortLabel}</Text>
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.ctaPrimary} />
        </Pressable>

        <Pressable
          style={[styles.chip, priceActive ? styles.chipActive : styles.chipInactive]}
          onPress={togglePriceSort}
          accessibilityRole="button"
        >
          <Text style={[styles.chipText, priceActive ? styles.chipTextActive : null]}>Цена</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={priceActive ? colors.ctaPrimary : colors.black} />
        </Pressable>

        <Pressable
          style={[styles.chip, dealsOnly ? styles.chipActive : styles.chipInactive]}
          onPress={() => onDealsChange(!dealsOnly)}
          accessibilityRole="button"
        >
          <Text style={[styles.chipText, dealsOnly ? styles.chipTextActive : null]}>Скидки</Text>
        </Pressable>
      </ScrollView>

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
                {sort === opt.id ? <MaterialCommunityIcons name="check" size={18} color={colors.ctaPrimary} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={filtersOpen} transparent animationType="fade" onRequestClose={() => onFiltersOpenChange(false)}>
        <Pressable style={styles.backdrop} onPress={() => onFiltersOpenChange(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Фильтры</Text>
            <View style={styles.filterChips}>
              <Chip label="В наличии" active={inStockOnly} onPress={() => onInStockChange(!inStockOnly)} />
              <Chip label="Скидки" active={dealsOnly} onPress={() => onDealsChange(!dealsOnly)} />
            </View>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                onResetFilters?.();
                onFiltersOpenChange(false);
              }}
            >
              <Text style={styles.sheetRowText}>Сбросить все фильтры</Text>
            </Pressable>
            {categoryName ? (
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  onClearCategory?.();
                  onFiltersOpenChange(false);
                }}
              >
                <Text style={styles.sheetRowText}>Сбросить категорию: {categoryName}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.sheetDone} onPress={() => onFiltersOpenChange(false)}>
              <Text style={styles.sheetDoneText}>Готово</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: CATALOG_SCREEN_PADDING,
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipSort: {
    borderColor: colors.ctaPrimary,
    backgroundColor: colors.white,
  },
  chipSortText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.black,
    fontWeight: "500",
  },
  chipSortValue: {
    color: colors.ctaPrimary,
    fontWeight: "700",
  },
  chipInactive: {
    borderColor: "#E9E9E9",
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.ctaPrimary,
    backgroundColor: "#FFF7F0",
  },
  chipText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.black,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.ctaPrimary,
  },
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
  sheetRowActive: { color: colors.ctaPrimary, fontWeight: "700" },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sheetDone: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDoneText: { ...typography.button, color: colors.white },
});
