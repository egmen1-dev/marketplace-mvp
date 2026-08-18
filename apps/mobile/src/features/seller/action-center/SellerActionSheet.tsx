import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { UniversalBottomSheet } from "../../../design-system/components/UniversalBottomSheet";
import { border, surface, text } from "../../../design-system/tokens/colors";
import { radii } from "../../../design-system/tokens/radius";
import { spacing } from "../../../design-system/tokens/spacing";
import { typography } from "../../../design-system/tokens/typography";
import type { SellerWorkspaceItemView } from "../seller-view";
import { resolveActionSheet } from "./action-router";

type Props = {
  task: SellerWorkspaceItemView | null;
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onExecute: (formValues: Record<string, string>) => void;
};

export function SellerActionSheet({ task, visible, loading, onClose, onExecute }: Props) {
  const config = useMemo(() => (task ? resolveActionSheet(task) : null), [task]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!config?.fields) {
      setFormValues({});
      return;
    }
    const defaults = Object.fromEntries(
      config.fields.map((field) => [field.key, field.defaultValue ?? ""]),
    );
    setFormValues(defaults);
  }, [config, task?.id]);

  if (!task || !config) return null;

  return (
    <UniversalBottomSheet
      visible={visible}
      title={config.title}
      subtitle={config.subtitle}
      onClose={onClose}
      primaryLabel={config.primaryLabel}
      secondaryLabel={config.secondaryLabel}
      onSecondary={onClose}
      loading={loading}
      onPrimary={() => onExecute(formValues)}
    >
      {config.mode === "form" && config.fields ? (
        <View style={styles.form}>
          {config.fields.map((field) => (
            <View key={field.key} style={styles.field}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={[styles.input, field.multiline ? styles.multiline : null]}
                value={formValues[field.key] ?? ""}
                onChangeText={(value) =>
                  setFormValues((prev) => ({ ...prev, [field.key]: value }))
                }
                placeholder={field.placeholder}
                placeholderTextColor={text.muted}
                keyboardType={field.keyboardType === "numeric" ? "numeric" : "default"}
                multiline={field.multiline}
                editable={!loading}
              />
            </View>
          ))}
        </View>
      ) : config.mode === "confirm" || config.mode === "open_url" ? (
        <Text style={styles.confirmHint}>
          {config.mode === "open_url"
            ? "Действие откроется в кабинете продавца."
            : "Подтвердите действие — задача будет выполнена без перехода на другой экран."}
        </Text>
      ) : null}
    </UniversalBottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  input: {
    ...typography.bodySmall,
    color: text.primary,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: surface.backgroundMuted,
    minHeight: 44,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  confirmHint: {
    ...typography.bodySmall,
    color: text.muted,
  },
});
