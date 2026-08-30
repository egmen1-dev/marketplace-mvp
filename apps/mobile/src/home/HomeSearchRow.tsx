import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { colors, typography } from "../theme/tokens";
import { HOME_FILTER_SIZE, HOME_SCREEN_PADDING, HOME_SEARCH_HEIGHT } from "./constants";

type HomeSearchRowProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
};

export function HomeSearchRow({ value, onChangeText, onSubmit }: HomeSearchRowProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.searchField}>
        <MaterialCommunityIcons name="magnify" size={20} color="#8A8A8A" />
        <TextInput
          testID="home-search-input"
          accessibilityLabel="Поиск товаров"
          placeholder="Поиск товаров"
          placeholderTextColor="#8A8A8A"
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
      </View>
      <Pressable
        style={styles.filterBtn}
        accessibilityRole="button"
        accessibilityLabel="Фильтры"
        onPress={() => router.push({ pathname: "/(tabs)/catalog", params: { focusSearch: "1" } })}
      >
        <MaterialCommunityIcons name="tune-variant" size={22} color={colors.black} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: HOME_SCREEN_PADDING,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: HOME_SEARCH_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: 14,
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
    width: HOME_FILTER_SIZE,
    height: HOME_FILTER_SIZE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
