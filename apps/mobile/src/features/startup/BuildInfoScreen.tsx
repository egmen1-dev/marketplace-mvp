import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BuildInfoPanel } from "./BuildInfoPanel";
import { PrimaryButton, SecondaryButton } from "../../components/ui";
import { getMobileBuildInfo } from "../../config/build-info";
import { brand, semantic, surface, text } from "../../design-system/tokens/colors";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";

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
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: surface.background },
  heading: { ...typography.h2, color: text.primary },
  subheading: { ...typography.body, color: text.secondary },
  warning: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: brand.primarySoft,
    borderWidth: 1,
    borderColor: semantic.warning,
  },
  warningTitle: { ...typography.body, color: text.primary, fontWeight: "700" },
  warningBody: { ...typography.body, color: text.secondary },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
