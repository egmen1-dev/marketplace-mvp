import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CommerceSectionHeader } from "./CommerceSectionHeader";
import { brand, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

const COLLAPSED_LINES = 4;

type Props = {
  description: string;
};

export const PdpDescription = memo(function PdpDescription({ description }: Props) {
  const [expanded, setExpanded] = useState(false);
  const long = description.length > 180 || description.split("\n").length > COLLAPSED_LINES;

  return (
    <View style={styles.wrap}>
      <CommerceSectionHeader title="Описание" />
      <Text style={styles.body} numberOfLines={expanded || !long ? undefined : COLLAPSED_LINES}>
        {description}
      </Text>
      {long ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Свернуть описание" : "Развернуть описание"}
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          style={styles.toggleHit}
        >
          <Text style={styles.toggle}>{expanded ? "Свернуть" : "Развернуть"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  body: { ...typography.body, color: text.secondary, lineHeight: 22 },
  toggle: { ...typography.bodySmall, color: brand.primary, fontWeight: "600" },
  toggleHit: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
});
