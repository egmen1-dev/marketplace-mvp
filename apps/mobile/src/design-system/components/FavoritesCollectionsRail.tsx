import { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { FavoriteCollection, FavoriteCollectionId } from "../../features/favorites/types";
import { brand, border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  collections: FavoriteCollection[];
  selectedId: FavoriteCollectionId;
  onSelect: (id: FavoriteCollectionId) => void;
};

export const FavoritesCollectionsRail = memo(function FavoritesCollectionsRail({ collections, selectedId, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Коллекции</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {collections.map((collection) => {
          const selected = collection.id === selectedId;
          const disabled = !collection.enabled;
          return (
            <Pressable
              key={collection.id}
              style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
              onPress={() => collection.enabled && onSelect(collection.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={collection.title}
            >
              <Text style={[styles.chipTitle, selected && styles.chipTitleSelected, disabled && styles.chipTitleDisabled]}>
                {collection.title}
              </Text>
              {!collection.enabled ? <Text style={styles.chipSubtitle}>{collection.subtitle}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { ...typography.caption, color: text.muted, textTransform: "uppercase", fontWeight: "700" },
  rail: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.default,
    justifyContent: "center",
    gap: 2,
  },
  chipSelected: { backgroundColor: brand.primarySoft, borderColor: brand.primary },
  chipDisabled: { opacity: 0.55 },
  chipTitle: { ...typography.bodySmall, color: text.primary, fontWeight: "700" },
  chipTitleSelected: { color: brand.primary },
  chipTitleDisabled: { color: text.muted },
  chipSubtitle: { ...typography.caption, color: text.muted, fontSize: 10 },
});
