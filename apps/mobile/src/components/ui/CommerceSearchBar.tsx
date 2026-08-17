import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { brand, border, surface, text } from "../../design-system/tokens/colors";
import { layout } from "../../design-system/tokens/layout";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";

type CommerceSearchBarProps = TextInputProps & {
  onClear?: () => void;
  history?: string[];
  popular?: string[];
  onSelectSuggestion?: (value: string) => void;
  onClearHistory?: () => void;
  showSuggestions?: boolean;
};

export function CommerceSearchBar({
  value,
  onClear,
  history = [],
  popular = [],
  onSelectSuggestion,
  onClearHistory,
  showSuggestions,
  ...rest
}: CommerceSearchBarProps) {
  const hasValue = typeof value === "string" && value.length > 0;
  const showPanel = showSuggestions && !hasValue && (history.length > 0 || popular.length > 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="magnify" size={22} color={text.muted} accessibilityElementsHidden />
        <TextInput
          placeholderTextColor={text.muted}
          style={styles.input}
          value={value}
          returnKeyType="search"
          {...rest}
        />
        {hasValue ? (
          <Pressable accessibilityLabel="Очистить" onPress={onClear} hitSlop={8} style={styles.clearBtn}>
            <MaterialCommunityIcons name="close-circle" size={20} color={text.muted} />
          </Pressable>
        ) : null}
      </View>

      {showPanel ? (
        <View style={styles.panel}>
          {history.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Недавние</Text>
                {onClearHistory ? (
                  <Pressable onPress={onClearHistory}>
                    <Text style={styles.sectionAction}>Очистить</Text>
                  </Pressable>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
                {history.map((item) => (
                  <Pressable key={item} style={styles.suggestChip} onPress={() => onSelectSuggestion?.(item)}>
                    <MaterialCommunityIcons name="history" size={14} color={text.muted} />
                    <Text style={styles.suggestText}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {popular.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Популярное</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
                {popular.map((item) => (
                  <Pressable key={item} style={styles.suggestChip} onPress={() => onSelectSuggestion?.(item)}>
                    <MaterialCommunityIcons name="fire" size={14} color={brand.primary} />
                    <Text style={styles.suggestText}>{item}</Text>
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
  clearBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  panel: {
    backgroundColor: surface.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: border.default,
    padding: spacing.md,
    gap: spacing.md,
  },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { ...typography.caption, color: text.muted, fontWeight: "600", textTransform: "uppercase" },
  sectionAction: { ...typography.caption, color: brand.primary, fontWeight: "600" },
  suggestRow: { gap: spacing.sm },
  suggestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: surface.background,
    borderWidth: 1,
    borderColor: border.default,
    minHeight: 36,
  },
  suggestText: { ...typography.caption, color: text.primary, fontWeight: "600" },
});
