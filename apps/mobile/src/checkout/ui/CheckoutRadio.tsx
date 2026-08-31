import { StyleSheet, View } from "react-native";

import { colors } from "../../theme/tokens";

export function CheckoutRadio({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.outer, selected ? styles.outerSelected : null]}>
      {selected ? <View style={styles.inner} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#C8C8C8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  outerSelected: {
    borderColor: colors.ctaPrimary,
  },
  inner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.ctaPrimary,
  },
});
