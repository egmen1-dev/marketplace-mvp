import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getBuildInfo } from "../src/beta/build-info";
import { getBetaEnvironment } from "../src/beta/environment";
import {
  copySellerJourneyDiagnostics,
  formatSellerJourneyDiagnostics,
  getSellerJourneyDiagnostics,
} from "../src/seller/journey-diagnostics";
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
  const env = getBetaEnvironment();
  const rcLabel = process.env.EXPO_PUBLIC_RC_LABEL ?? "RC8";
  const [diagnosticsPreview, setDiagnosticsPreview] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

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

      {env.isBeta ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Диагностика seller journey</Text>
          <Text style={styles.hint}>
            При проблеме с созданием ЛОТа: сделайте скриншот и скопируйте диагностику ({getSellerJourneyDiagnostics().length} событий в буфере).
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.copyButton}
            onPress={() => {
              void (async () => {
                const text = await copySellerJourneyDiagnostics();
                setDiagnosticsPreview(text);
                setCopyStatus("Диагностика скопирована");
              })();
            }}
          >
            <Text style={styles.copyButtonText}>Скопировать диагностику</Text>
          </Pressable>
          {copyStatus ? <Text style={styles.copyStatus}>{copyStatus}</Text> : null}
          {diagnosticsPreview ? (
            <Text style={styles.diagnosticsPreview} selectable>
              {diagnosticsPreview}
            </Text>
          ) : (
            <Text style={styles.diagnosticsPreview} selectable>
              {formatSellerJourneyDiagnostics()}
            </Text>
          )}
        </View>
      ) : null}

      <Text style={styles.hint}>
        Сверьте эти данные с ожидаемой RC-сборкой перед физическим тестированием. Если версия или commit не совпадают — установлена устаревшая APK.
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
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.h2, color: colors.black },
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
  copyButton: {
    backgroundColor: colors.orange,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  copyButtonText: { ...typography.button, color: colors.white },
  copyStatus: { ...typography.caption, color: colors.orange, fontWeight: "600", textAlign: "center" },
  diagnosticsPreview: {
    ...typography.caption,
    color: colors.gray700,
    fontFamily: "monospace",
    backgroundColor: colors.gray100,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
});
