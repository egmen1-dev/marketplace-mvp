import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, typography } from "../theme/tokens";
import { HOME_PROMO_TILES } from "./content";
import { HOME_SCREEN_PADDING } from "./constants";
import { buildHomeCategoryCatalogRoute } from "./resolveHomeCategoryRoute";

const TILE_WIDTH = Math.round(Dimensions.get("window").width * 0.44);

type HomePromoTilesProps = {
  categories: Array<{ id: string; name: string; slug?: string }>;
};

export function HomePromoTiles({ categories }: HomePromoTilesProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Лучшие предложения</Text>
        <Pressable onPress={() => router.push("/(tabs)/catalog")} accessibilityRole="button">
          <Text style={styles.action}>Смотреть все</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {HOME_PROMO_TILES.map((tile) => (
          <Pressable
            key={tile.id}
            style={[styles.tile, { backgroundColor: tile.background }]}
            accessibilityRole="button"
            onPress={() =>
              router.push(
                buildHomeCategoryCatalogRoute(tile.id as "electronics" | "home" | "transport", categories),
              )
            }
          >
            <View style={styles.copy}>
              <Text style={styles.tileTitle}>{tile.title}</Text>
              <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
            </View>
            <View style={styles.arrowBtn}>
              <MaterialCommunityIcons name="arrow-top-right" size={14} color={colors.black} />
            </View>
            <View style={[styles.iconWrap, { backgroundColor: tile.accent }]}>
              <MaterialCommunityIcons name={tile.icon} size={40} color={colors.ctaPrimary} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HOME_SCREEN_PADDING,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: colors.black,
  },
  action: {
    ...typography.caption,
    fontSize: 14,
    color: colors.ctaPrimary,
    fontWeight: "600",
  },
  row: {
    paddingHorizontal: HOME_SCREEN_PADDING,
    gap: 10,
  },
  tile: {
    width: TILE_WIDTH,
    minHeight: 156,
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
    position: "relative",
  },
  copy: {
    gap: 4,
    zIndex: 1,
    maxWidth: "68%",
  },
  tileTitle: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.black,
  },
  tileSubtitle: {
    fontSize: 12,
    lineHeight: 15,
    color: "#777777",
  },
  arrowBtn: {
    position: "absolute",
    left: 14,
    bottom: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECECEC",
    zIndex: 2,
  },
  iconWrap: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
