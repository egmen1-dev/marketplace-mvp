import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../tokens/colors";
import { typography } from "../tokens/typography";

export function TabBarBadge({ count, children }: { count?: number; children: ReactNode }) {
  const show = typeof count === "number" && count > 0;
  const label = count && count > 99 ? "99+" : String(count ?? "");

  return (
    <View style={styles.wrap}>
      {children}
      {show ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: { ...typography.caption, color: colors.white, fontSize: 10, fontWeight: "700", lineHeight: 12 },
});
