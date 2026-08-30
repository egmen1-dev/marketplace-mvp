import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/tokens";
import { CATALOG_SCREEN_PADDING } from "./constants";
import { formatProductCount } from "./format";

export function CatalogTitleRow({ count, hasMore }: { count: number; hasMore: boolean }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Каталог товаров</Text>
      <Text style={styles.count}>{formatProductCount(count, hasMore)}</Text>
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
