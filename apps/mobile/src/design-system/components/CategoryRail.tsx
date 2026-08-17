import type { ReactNode } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export type CategoryItem = { id: string; name: string; slug?: string };

const ICON_RULES: Array<{ match: RegExp; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = [
  { match: /электрон|телефон|iphone|ноутбук/i, icon: "cellphone" },
  { match: /одежд|обув|мод/i, icon: "tshirt-crew-outline" },
  { match: /дом|быт|мебел/i, icon: "sofa-outline" },
  { match: /дет|игруш/i, icon: "baby-carriage" },
  { match: /спорт|fitness/i, icon: "dumbbell" },
  { match: /красот|здоров/i, icon: "flower-outline" },
  { match: /авто|запчаст/i, icon: "car-outline" },
  { match: /книг|канц/i, icon: "book-open-variant" },
];

function iconForCategory(name: string): React.ComponentProps<typeof MaterialCommunityIcons>["name"] {
  const hit = ICON_RULES.find((rule) => rule.match.test(name));
  return hit?.icon ?? "tag-outline";
}

export function CategoryRail({
  categories,
  onSelect,
}: {
  categories: CategoryItem[];
  onSelect: (category: CategoryItem) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((cat) => (
        <Pressable
          key={cat.id}
          accessibilityRole="button"
          accessibilityLabel={`Категория ${cat.name}`}
          onPress={() => onSelect(cat)}
          style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
        >
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name={iconForCategory(cat.name)} size={20} color={brand.primary} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {cat.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function CategoryRailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.chip, styles.skeletonChip]} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    width: 88,
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: surface.background,
    ...shadows.card,
  },
  chipPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typography.caption, color: text.primary, textAlign: "center", fontWeight: "600" },
  skeletonChip: { backgroundColor: surface.backgroundMuted },
});
