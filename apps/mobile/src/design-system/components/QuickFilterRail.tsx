import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { QuickFilterId } from "../../features/catalog-discovery/types";
import { QUICK_FILTER_OPTIONS } from "../../features/catalog-discovery/types";

export function QuickFilterRail({
  activeId,
  onChange,
}: {
  activeId: QuickFilterId;
  onChange: (id: QuickFilterId) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {QUICK_FILTER_OPTIONS.map((option) => {
        const active = activeId === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={[styles.chip, active ? styles.chipActive : null]}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: surface.backgroundMuted,
    backgroundColor: surface.background,
    minHeight: 36,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  label: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  labelActive: { color: text.inverse },
});
