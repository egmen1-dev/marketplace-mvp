import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { brand, surface, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { ProductSuggestItem } from "../../features/catalog-discovery/types";

type CatalogSearchFieldProps = TextInputProps & {
  onClear?: () => void;
  history?: string[];
  popular?: string[];
  suggestions?: ProductSuggestItem[];
  suggestLoading?: boolean;
  onSelectSuggestion?: (value: string) => void;
  onClearHistory?: () => void;
  showSuggestions?: boolean;
};

export function CatalogSearchField({
  value,
  onClear,
  history = [],
  popular = [],
  suggestions = [],
  suggestLoading,
  onSelectSuggestion,
  onClearHistory,
  showSuggestions,
  ...rest
}: CatalogSearchFieldProps) {
  const hasValue = typeof value === "string" && value.length > 0;
  const typedSuggestions = hasValue && suggestions.length > 0;
  const showHistoryPanel = showSuggestions && !hasValue && (history.length > 0 || popular.length > 0);
  const showTypedPanel = showSuggestions && hasValue && (suggestLoading || typedSuggestions);

  return (
    <View style={styles.wrap}>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="magnify" size={22} color={text.muted} accessibilityElementsHidden />
        <TextInput
          placeholder="Поиск товаров"
          placeholderTextColor={text.muted}
          style={styles.input}
          value={value}
          returnKeyType="search"
          accessibilityLabel="Поиск товаров"
          {...rest}
        />
        {suggestLoading && hasValue ? (
          <ActivityIndicator size="small" color={brand.primary} style={styles.inlineLoader} />
        ) : null}
        {hasValue ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
            onPress={onClear}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color={text.muted} />
          </Pressable>
        ) : null}
      </View>

      {showTypedPanel ? (
        <View style={styles.panel}>
          {suggestions.map((item) => (
            <Pressable
              key={`${item.type}-${item.id}`}
              style={styles.suggestRow}
              onPress={() => onSelectSuggestion?.(item.title)}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="magnify" size={16} color={text.muted} />
              <Text style={styles.suggestText} numberOfLines={1}>
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {showHistoryPanel ? (
        <View style={styles.panel}>
          {history.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Недавние</Text>
                {onClearHistory ? (
                  <Pressable onPress={onClearHistory} accessibilityRole="button">
                    <Text style={styles.sectionAction}>Очистить</Text>
                  </Pressable>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {history.map((item) => (
                  <Pressable key={item} style={styles.chip} onPress={() => onSelectSuggestion?.(item)}>
                    <MaterialCommunityIcons name="history" size={14} color={text.muted} />
                    <Text style={styles.chipText}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {popular.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Популярное</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {popular.map((item) => (
                  <Pressable key={item} style={styles.chip} onPress={() => onSelectSuggestion?.(item)}>
                    <MaterialCommunityIcons name="fire" size={14} color={brand.primary} />
                    <Text style={styles.chipText}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: surface.backgroundMuted,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    minHeight: layout.searchFieldMinHeight,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: brand.primarySoft,
  },
  input: { flex: 1, ...typography.body, color: text.primary, paddingVertical: spacing.sm },
  inlineLoader: { marginRight: spacing.xs },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  panel: {
    backgroundColor: surface.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: surface.backgroundMuted,
    padding: spacing.md,
    gap: spacing.md,
  },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { ...typography.caption, color: text.muted, fontWeight: "600", textTransform: "uppercase" },
  sectionAction: { ...typography.caption, color: brand.primary, fontWeight: "600" },
  chipRow: { gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: surface.background,
    borderWidth: 1,
    borderColor: surface.backgroundMuted,
    minHeight: 36,
  },
  chipText: { ...typography.caption, color: text.primary, fontWeight: "600" },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  suggestText: { ...typography.body, color: text.primary, flex: 1 },
});
