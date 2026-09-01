import { StyleSheet, Text, View } from "react-native";

import { formatCatalogProductCount } from "../../commerce/catalog-query";
import { colors } from "../../theme/tokens";
import { CATALOG_SCREEN_PADDING } from "./constants";

export function CatalogTitleRow({
  count,
  hasMore,
  countMode = "server",
}: {
  count: number;
  hasMore: boolean;
  countMode?: "server" | "client_deals";
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Каталог товаров</Text>
      <Text style={styles.count}>{formatCatalogProductCount(count, hasMore, countMode)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: CATALOG_SCREEN_PADDING,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.black,
    flexShrink: 1,
  },
  count: {
    fontSize: 13,
    lineHeight: 17,
    color: "#8A8A8A",
    textAlign: "right",
    flexShrink: 0,
    maxWidth: "48%",
  },
});
