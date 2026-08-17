import { router } from "expo-router";
import { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CatalogProductCard } from "./CatalogProductCard";
import { CommerceSectionHeader } from "./CommerceSectionHeader";
import type { MobileProductListItem } from "../../api/endpoints";
import type { ProfileCategoryStat } from "../../features/profile/types";
import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  recentItems: MobileProductListItem[];
  categories: ProfileCategoryStat[];
};

export const ProfileSavedData = memo(function ProfileSavedData({ recentItems, categories }: Props) {
  if (recentItems.length === 0 && categories.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Сохранённые данные</Text>

      {categories.length > 0 ? (
        <View style={styles.categories}>
          <CommerceSectionHeader title="Любимые категории" />
          <View style={styles.chips}>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.chip}>
                <Text style={styles.chipText}>{cat.name}</Text>
                <Text style={styles.chipCount}>{cat.count}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {recentItems.length > 0 ? (
        <View style={styles.recent}>
          <CommerceSectionHeader title="Недавно просмотренные" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {recentItems.slice(0, 6).map((item) => (
              <View key={item.id} style={styles.cardWrap}>
                <CatalogProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  sectionTitle: { ...typography.caption, color: text.muted, textTransform: "uppercase", fontWeight: "700" },
  categories: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: surface.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  chipText: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  chipCount: { ...typography.caption, color: brand.primary, fontWeight: "700" },
  recent: { gap: spacing.sm },
  rail: { gap: spacing.md, paddingVertical: spacing.xs },
  cardWrap: { width: 168 },
});
