import { StyleSheet, Text, View } from "react-native";

import { Badge } from "../../../design-system/primitives/Badge";
import { border, semantic, surface, text } from "../../../design-system/tokens/colors";
import { radii } from "../../../design-system/tokens/radius";
import { spacing } from "../../../design-system/tokens/spacing";
import { typography } from "../../../design-system/tokens/typography";
import type { SellerProductEditorForm } from "./seller-product-editor-view";

type Props = {
  moderation: SellerProductEditorForm["moderation"];
};

export function ModerationFeedbackCard({ moderation }: Props) {
  if (!moderation) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Модерация</Text>
        <Badge label={moderation.status} tone="warning" />
      </View>
      {moderation.qualityScore != null ? (
        <Text style={styles.meta}>Оценка качества: {moderation.qualityScore}</Text>
      ) : null}
      {moderation.reason ? <Text style={styles.reason}>{moderation.reason}</Text> : null}
      {moderation.issues.length > 0 ? (
        <View style={styles.issues}>
          {moderation.issues.map((issue) => (
            <Text key={issue} style={styles.issue}>
              • {issue}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: semantic.warningSoft,
    borderWidth: 1,
    borderColor: semantic.warning,
    gap: spacing.sm,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  meta: { ...typography.caption, color: text.secondary },
  reason: { ...typography.bodySmall, color: text.primary },
  issues: { gap: spacing.xs },
  issue: { ...typography.bodySmall, color: text.secondary },
});
