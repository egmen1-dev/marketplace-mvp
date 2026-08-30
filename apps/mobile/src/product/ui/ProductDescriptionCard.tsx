import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";

const PREVIEW_LINES = 4;

export function ProductDescriptionCard({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = description.trim();

  if (!trimmed) return null;

  const isLong = trimmed.length > 160 || trimmed.split("\n").length > PREVIEW_LINES;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.header}
        onPress={isLong ? () => setExpanded((v) => !v) : undefined}
        accessibilityRole={isLong ? "button" : undefined}
      >
        <Text style={styles.heading}>Описание</Text>
        {isLong ? (
          <MaterialCommunityIcons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={22}
            color={colors.gray500}
          />
        ) : null}
      </Pressable>
      <Text style={styles.body} numberOfLines={expanded || !isLong ? undefined : PREVIEW_LINES}>
        {trimmed}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.black,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#8A8A8A",
  },
});
