import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { SearchSuggestion } from "../../commerce/search-state";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { CATALOG_SCREEN_PADDING } from "./constants";

export type CatalogSearchPanelMode =
  "closed" | "history" | "suggestions" | "loading";

type Props = {
  mode: CatalogSearchPanelMode;
  history: string[];
  suggestions: SearchSuggestion[];
  onSelect: (value: string) => void;
  onClearHistory: () => void;
};

export function CatalogSearchPanel({
  mode,
  history,
  suggestions,
  onSelect,
  onClearHistory,
}: Props) {
  if (mode === "closed" || (mode === "history" && history.length === 0))
    return null;

  return (
    <View style={styles.panel} testID="catalog-search-panel">
      {mode === "history" ? (
        <>
          <View style={styles.headingRow}>
            <Text style={styles.heading}>Недавние запросы</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Очистить историю поиска"
              onPress={onClearHistory}
            >
              <Text style={styles.clear}>Очистить</Text>
            </Pressable>
          </View>
          {history.map((value) => (
            <SearchRow
              key={value.toLocaleLowerCase()}
              icon="history"
              value={value}
              onPress={() => onSelect(value)}
            />
          ))}
        </>
      ) : null}
      {mode === "loading" ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.ctaPrimary} />
          <Text style={styles.muted}>Ищем варианты…</Text>
        </View>
      ) : null}
      {mode === "suggestions"
        ? suggestions.map((item) => (
            <SearchRow
              key={`${item.type}:${item.id}`}
              icon="magnify"
              value={item.title}
              onPress={() => onSelect(item.title)}
            />
          ))
        : null}
    </View>
  );
}

function SearchRow({
  icon,
  value,
  onPress,
}: {
  icon: "history" | "magnify";
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={18} color={colors.gray500} />
      <Text numberOfLines={1} style={styles.value}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: CATALOG_SCREEN_PADDING,
    marginTop: -8,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heading: { ...typography.caption, color: colors.gray700, fontWeight: "600" },
  clear: { ...typography.caption, color: colors.ctaPrimary, fontWeight: "600" },
  row: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowPressed: { backgroundColor: colors.gray100 },
  value: { flex: 1, ...typography.body, color: colors.gray900 },
  loadingRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  muted: { ...typography.caption, color: colors.gray500 },
});
