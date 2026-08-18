import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { brand, border, surface, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export interface UniversalBottomSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children?: React.ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  loading?: boolean;
}

export function UniversalBottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel = "Отмена",
  onSecondary,
  loading = false,
}: UniversalBottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: surface.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: border.default }]} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
          <View style={styles.actions}>
            {secondaryLabel ? (
              <Pressable
                style={styles.secondaryBtn}
                onPress={onSecondary ?? onClose}
                disabled={loading}
              >
                <Text style={styles.secondaryText}>{secondaryLabel}</Text>
              </Pressable>
            ) : null}
            {primaryLabel && onPrimary ? (
              <Pressable style={styles.primaryBtn} onPress={onPrimary} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={text.inverse} size="small" />
                ) : (
                  <Text style={styles.primaryText}>{primaryLabel}</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...typography.body,
    fontWeight: "700",
    color: text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: text.muted,
    marginBottom: spacing.md,
  },
  body: {
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: border.default,
    alignItems: "center",
    minHeight: layout.buttonHeight,
    justifyContent: "center",
  },
  secondaryText: {
    ...typography.bodySmall,
    color: text.secondary,
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    minHeight: layout.buttonHeight,
    justifyContent: "center",
    backgroundColor: brand.primary,
  },
  primaryText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: text.inverse,
  },
});
