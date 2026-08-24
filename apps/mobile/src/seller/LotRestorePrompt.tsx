import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, SecondaryButton } from "../components/ui";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { LOT_CREATE_COPY } from "./lot-create-copy";

export function LotRestorePrompt({
  onContinue,
  onDelete,
}: {
  onContinue: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>{LOT_CREATE_COPY.restoreTitle}</Text>
        <Text style={styles.body}>{LOT_CREATE_COPY.restoreBody}</Text>
        <View style={styles.actions}>
          <PrimaryButton label={LOT_CREATE_COPY.restoreContinue} fullWidth onPress={onContinue} />
          <SecondaryButton label={LOT_CREATE_COPY.restoreDelete} fullWidth onPress={onDelete} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  card: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.gray100,
  },
  title: { ...typography.h2, color: colors.black, textAlign: "center" },
  body: { ...typography.body, color: colors.gray700, textAlign: "center" },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
