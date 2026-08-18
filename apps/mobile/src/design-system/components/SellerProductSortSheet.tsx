import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SellerProductSort } from "../../domain/contracts/entities/seller";
import { SELLER_PRODUCT_SORT_LABELS } from "../../features/seller/products/seller-products-view";
import { brand, border, surface, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

const SORT_OPTIONS = Object.entries(SELLER_PRODUCT_SORT_LABELS) as Array<[SellerProductSort, string]>;

export function SellerProductSortSheet({
  visible,
  sort,
  onSelect,
  onClose,
}: {
  visible: boolean;
  sort: SellerProductSort;
  onSelect: (sort: SellerProductSort) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть сортировку" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Сортировка</Text>
        {SORT_OPTIONS.map(([id, label]) => {
          const active = sort === id;
          return (
            <Pressable
              key={id}
              style={styles.option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onSelect(id);
                onClose();
              }}
            >
              <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{label}</Text>
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
    backgroundColor: surface.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: border.default,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: { ...typography.body, fontWeight: "700", color: text.primary, marginBottom: spacing.sm },
  option: {
    minHeight: layout.buttonHeight,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: border.default,
  },
  optionText: { ...typography.bodySmall, color: text.primary },
  optionTextActive: { color: brand.primary, fontWeight: "700" },
});
