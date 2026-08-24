import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../theme/tokens";
import { LOT_CREATE_COPY } from "./lot-create-copy";
import type { AutosaveStatus } from "./use-lot-create-form";

export function LotAutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === "idle") return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        {status === "saving" ? LOT_CREATE_COPY.autosaveSaving : LOT_CREATE_COPY.autosaveSaved}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-end" },
  text: { ...typography.caption, color: colors.gray500, fontWeight: "600" },
});
