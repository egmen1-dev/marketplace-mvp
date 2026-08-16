import { ScrollView, StyleSheet, Text, View } from "react-native";

import { bootLogger } from "../../boot/boot-logger";
import { BOOT_STAGE_LABELS, BootStage } from "../../boot/boot-types";
import { loadLastBootFailure, loadLastStartupReport } from "../../boot/boot-storage";
import { colors, spacing, typography } from "../../theme/tokens";
import { useEffect, useState } from "react";
import type { BootFailure, StartupReport } from "../../boot/boot-types";

function formatStageStatus(report: StartupReport | null, stage: BootStage): string {
  const entry = report?.stages.find((s) => s.stage === stage);
  if (!entry) return "—";
  return `${entry.status}${entry.durationMs ? ` · ${entry.durationMs}ms` : ""}${entry.message ? ` · ${entry.message}` : ""}`;
}

export function StartupDiagnosticsScreen() {
  const [report, setReport] = useState<StartupReport | null>(null);
  const [failure, setFailure] = useState<BootFailure | null>(null);
  const meta = bootLogger.getDiagnosticsMeta();

  useEffect(() => {
    void Promise.all([loadLastStartupReport(), loadLastBootFailure()]).then(([lastReport, lastFailure]) => {
      setReport(lastReport);
      setFailure(lastFailure);
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Startup Diagnostics</Text>

      <Section title="Build">
        <Row label="App Version" value={`${meta.appVersion} (${meta.buildNumber})`} />
        <Row label="Commit" value={meta.commit} />
        <Row label="Environment" value={meta.environment} />
      </Section>

      <Section title="Last Boot">
        <Row label="Success" value={report ? (report.success ? "yes" : "no") : "—"} />
        <Row label="Duration" value={report ? `${report.durationMs}ms` : "—"} />
        <Row label="Destination" value={report?.destination ?? "—"} />
        <Row label="Started" value={report?.startedAt ?? "—"} />
      </Section>

      <Section title="Last Error">
        <Row label="Stage" value={failure ? BOOT_STAGE_LABELS[failure.stage] : "—"} />
        <Row label="Code" value={failure?.code ?? "—"} />
        <Row label="Message" value={failure?.message ?? "—"} />
        <Row label="HTTP" value={failure?.httpStatus ? String(failure.httpStatus) : "—"} />
      </Section>

      <Section title="Stage durations">
        <Row label="Bootstrap" value={formatStageStatus(report, BootStage.BOOTSTRAP)} />
        <Row label="Remote Config" value={formatStageStatus(report, BootStage.REMOTE_CONFIG)} />
        <Row label="Update" value={formatStageStatus(report, BootStage.UPDATE)} />
        <Row label="Session" value={formatStageStatus(report, BootStage.SESSION)} />
        <Row label="Navigation" value={formatStageStatus(report, BootStage.NAVIGATION)} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.white },
  title: { ...typography.title, color: colors.black },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.subtitle, color: colors.orange },
  row: { gap: 2 },
  rowLabel: { ...typography.caption, color: colors.gray500 },
  rowValue: { ...typography.body, color: colors.black },
});
