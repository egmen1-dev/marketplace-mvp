import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";
import { HOME_TRUST_ITEMS } from "./content";
import { HOME_SCREEN_PADDING } from "./constants";

export function HomeTrustStrip() {
  return (
    <View style={styles.wrap}>
      {HOME_TRUST_ITEMS.map((item, index) => (
        <Fragment key={item.id}>
          <View style={styles.item}>
            <MaterialCommunityIcons name={item.icon} size={22} color={colors.ctaPrimary} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
          {index < HOME_TRUST_ITEMS.length - 1 ? <View style={styles.separator} /> : null}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: HOME_SCREEN_PADDING,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    backgroundColor: colors.white,
    flexDirection: "row",
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: "stretch",
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.black,
    textAlign: "center",
  },
  text: {
    fontSize: 10,
    lineHeight: 13,
    color: "#777777",
    textAlign: "center",
  },
  separator: {
    width: 1,
    backgroundColor: "#E9E9E9",
    marginVertical: 2,
  },
});
