import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Ref } from "react";

import { colors, typography } from "../../theme/tokens";
import { CATALOG_SCREEN_PADDING, CATALOG_SEARCH_HEIGHT } from "./constants";

type CatalogSearchRowProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onFilterPress: () => void;
  inputRef?: Ref<TextInput>;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function CatalogSearchRow({
  value,
  onChangeText,
  onSubmit,
  onFilterPress,
  inputRef,
  onFocus,
  onBlur,
}: CatalogSearchRowProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.searchField}>
        <MaterialCommunityIcons name="magnify" size={20} color="#8A8A8A" />
        <TextInput
          ref={inputRef}
          testID="catalog-search-input"
          accessibilityLabel="Поиск товаров в каталоге"
          placeholder="Поиск товаров в каталоге"
          placeholderTextColor="#8A8A8A"
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
      <Pressable style={styles.filterBtn} accessibilityRole="button" accessibilityLabel="Фильтры" onPress={onFilterPress}>
        <MaterialCommunityIcons name="tune-variant" size={18} color={colors.black} />
        <Text style={styles.filterText}>Фильтры</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: CATALOG_SCREEN_PADDING,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: CATALOG_SEARCH_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.black,
    paddingVertical: 0,
    fontSize: 15,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: CATALOG_SEARCH_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    backgroundColor: colors.white,
  },
  filterText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.black,
  },
});
