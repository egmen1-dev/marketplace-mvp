import { Pressable, StyleSheet, Text, View } from "react-native";

import { brand, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export function CommerceSectionHeader({
  title,
  subtitle,
  actionLabel = "Смотреть все",
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}: ${title}`}
          onPress={onAction}
          hitSlop={8}
          style={styles.actionHit}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  textBlock: { flex: 1, gap: spacing.xs },
  title: { ...typography.h2, color: text.primary },
  subtitle: { ...typography.caption, color: text.muted },
  action: { ...typography.bodySmall, color: brand.primary, fontWeight: "600" },
  actionHit: { minHeight: 44, justifyContent: "center", paddingLeft: spacing.sm },
});
