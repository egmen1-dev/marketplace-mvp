import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand, semantic, text } from "../../../design-system/tokens/colors";
import { radii } from "../../../design-system/tokens/radius";
import { spacing } from "../../../design-system/tokens/spacing";
import { typography } from "../../../design-system/tokens/typography";
import type { ActionResultState } from "./useSellerActionCenter";

export interface ActionResultBannerProps {
  result: ActionResultState;
  onDismiss: () => void;
  onUndo?: () => void;
  undoLoading?: boolean;
}

export function ActionResultBanner({
  result,
  onDismiss,
  onUndo,
  undoLoading,
}: ActionResultBannerProps) {
  if (!result.visible) return null;

  const bg = result.success ? semantic.successSoft : semantic.dangerSoft;
  const border = result.success ? semantic.success : semantic.danger;
  const tone = result.success ? semantic.success : semantic.danger;

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.message, { color: text.primary }]}>{result.message}</Text>
      <View style={styles.actions}>
        {result.success && result.undo && onUndo ? (
          <Pressable onPress={onUndo} disabled={undoLoading}>
            <Text style={[styles.undo, { color: brand.primary }]}>
              {undoLoading ? "Отмена…" : "Отменить"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onDismiss}>
          <Text style={[styles.dismiss, { color: tone }]}>Закрыть</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  message: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  undo: {
    ...typography.caption,
    fontWeight: "600",
  },
  dismiss: {
    ...typography.caption,
    fontWeight: "600",
  },
});
