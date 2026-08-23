import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getBuildInfo } from "../src/beta/build-info";
import { colors, radii, spacing, typography } from "../src/theme/tokens";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} selectable>
        {value}
      </Text>
    </View>
  );
}

export default function AboutScreen() {
  const build = getBuildInfo();
  const rcLabel = process.env.EXPO_PUBLIC_RC_LABEL ?? "RC5";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.appName}>ЛОТ</Text>
        <Text style={styles.version}>
          {build.appVersion} ({build.buildNumber})
        </Text>
        <Text style={styles.rc}>{rcLabel} · {build.channel}</Text>
      </View>

      <View style={styles.card}>
        <InfoRow label="Версия" value={`${build.appVersion} (code ${build.buildNumber})`} />
        <InfoRow label="Сборка" value={rcLabel} />
        <InfoRow label="Канал" value={build.channel} />
        <InfoRow label="Среда" value={build.environment} />
        <InfoRow label="Commit" value={build.commitSha.slice(0, 7)} />
        <InfoRow label="Время сборки" value={build.buildTime} />
        <InfoRow label="API" value={build.apiBaseUrl} />
      </View>

      <Text style={styles.hint}>
        Сверьте эти данные с ожидаемой RC5-сборкой перед физическим тестированием. Если версия или commit не совпадают — установлена устаревшая APK.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.gray100 },
  hero: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray200,
    gap: spacing.xs,
  },
  appName: { ...typography.h1, color: colors.orange },
  version: { ...typography.h2 },
  rc: { ...typography.caption, color: colors.gray500, fontWeight: "600" },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: spacing.xs,
  },
  label: { ...typography.caption, color: colors.gray500, fontWeight: "600" },
  value: { ...typography.body, color: colors.black },
  hint: { ...typography.caption, color: colors.gray500, textAlign: "center" },
});
