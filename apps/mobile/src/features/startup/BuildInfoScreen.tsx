import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BuildInfoPanel } from "./BuildInfoPanel";
import { PrimaryButton, SecondaryButton } from "../../design-system/forms/buttons";
import { getMobileBuildInfo } from "../../config/build-info";
import { colors, spacing, typography } from "../../theme/tokens";

export function BuildInfoScreen() {
  const router = useRouter();
  const info = getMobileBuildInfo();
  const commitUnknown = info.commit === "unknown" || info.gitSha === "unknown";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Build Info</Text>
      <Text style={styles.subheading}>Метаданные установленного билда — без adb и Android Studio.</Text>

      <BuildInfoPanel />

      {commitUnknown ? (
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>Commit не вшит в APK</Text>
          <Text style={styles.warningBody}>
            Сборка была выполнена без `node scripts/write-mobile-build-info.mjs`. Пересоберите APK после этой команды.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label="Startup Diagnostics" onPress={() => router.push("/startup-diagnostics")} fullWidth />
        <SecondaryButton label="Назад" onPress={() => router.back()} fullWidth />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  heading: { ...typography.title, color: colors.black },
  subheading: { ...typography.body, color: colors.gray700 },
  warning: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.orangeSoft,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningTitle: { ...typography.body, color: colors.black, fontWeight: "700" },
  warningBody: { ...typography.body, color: colors.gray700 },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
