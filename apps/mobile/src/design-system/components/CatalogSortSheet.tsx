import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { CATALOG_SORT_OPTIONS, type CatalogSort } from "../../features/catalog-discovery/types";

export function CatalogSortSheet({
  visible,
  sort,
  onSelect,
  onClose,
}: {
  visible: boolean;
  sort: CatalogSort;
  onSelect: (sort: CatalogSort) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть сортировку" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Сортировка</Text>
        {CATALOG_SORT_OPTIONS.map((option) => {
          const active = sort === option.id;
          return (
            <Pressable
              key={option.id}
              style={styles.option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onSelect(option.id);
                onClose();
              }}
            >
              <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{option.label}</Text>
              {active ? <MaterialCommunityIcons name="check" size={20} color={brand.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17,17,17,0.45)" },
  sheet: {
    backgroundColor: surface.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: surface.backgroundMuted,
    marginBottom: spacing.sm,
  },
  title: { ...typography.h3, color: text.primary, marginBottom: spacing.sm },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  optionText: { ...typography.body, color: text.primary },
  optionTextActive: { color: brand.primary, fontWeight: "700" },
});
