import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { brand, surface, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
};

export const FavoritesSearchField = memo(function FavoritesSearchField({ value, onChangeText, onClear }: Props) {
  const hasValue = value.length > 0;

  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name="magnify" size={22} color={text.muted} accessibilityElementsHidden />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Поиск в избранном"
        placeholderTextColor={text.muted}
        style={styles.input}
        returnKeyType="search"
        accessibilityLabel="Поиск в избранном"
        autoCorrect={false}
      />
      {hasValue ? (
        <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Очистить поиск" style={styles.clearBtn}>
          <MaterialCommunityIcons name="close-circle" size={20} color={text.muted} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: surface.backgroundMuted,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: brand.primarySoft,
    paddingHorizontal: spacing.md,
    minHeight: layout.searchFieldMinHeight,
  },
  input: { flex: 1, ...typography.body, color: text.primary, paddingVertical: spacing.sm },
  clearBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
});
