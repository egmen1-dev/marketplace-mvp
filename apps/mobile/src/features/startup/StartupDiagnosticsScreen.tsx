import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getCurrentBootId } from "../../boot/boot-session";
import { loadBootHistory, loadLastBootFailure, loadLastStartupReport } from "../../boot/boot-storage";
import type { BootFailure, StartupReport } from "../../boot/boot-types";
import { formatBootTimeline, formatHistoryEntry } from "../../../../../lib/mobile/diagnostics/format-report";
import type { BootHistoryEntry, DiagnosticsReport } from "../../../../../lib/mobile/diagnostics/types";
import { PrimaryButton, SecondaryButton } from "../../components/ui";
import { collectAppInfo, collectDeviceInfo } from "../../diagnostics/device-info";
import { getNetworkSummary, runConnectivityCheck } from "../../diagnostics/connectivity-check";
import { buildDiagnosticsReport } from "../../diagnostics/diagnostics-service";
import { copyDiagnosticsText, exportDiagnosticsJson } from "../../diagnostics/diagnostics-actions";
import { BOOT_STAGE_LABELS, BootStage } from "../../boot/boot-types";
import { brand, border, semantic, surface, text } from "../../design-system/tokens/colors";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";

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

export function StartupDiagnosticsScreen() {
  const [report, setReport] = useState<StartupReport | null>(null);
  const [failure, setFailure] = useState<BootFailure | null>(null);
  const [history, setHistory] = useState<BootHistoryEntry[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [timeline, setTimeline] = useState("");
  const app = collectAppInfo();
  const device = collectDeviceInfo();

  const refresh = useCallback(async () => {
    const [lastReport, lastFailure, bootHistory, network, connectivity] = await Promise.all([
      loadLastStartupReport(),
      loadLastBootFailure(),
      loadBootHistory(),
      getNetworkSummary(),
      runConnectivityCheck(),
    ]);
    setReport(lastReport);
    setFailure(lastFailure);
    setHistory(bootHistory);
    setTimeline(formatBootTimeline(lastReport));

    if (lastFailure) {
      const built = await buildDiagnosticsReport({
        bootId: lastReport?.bootId ?? getCurrentBootId(),
        retryCount: lastReport?.retryCount ?? 0,
        failure: lastFailure,
        startupReport: lastReport,
      });
      built.connectivity = connectivity;
      built.network = { ...built.network, type: network.type, reachable: network.reachable };
      setDiagnostics(built);
    } else {
      setDiagnostics(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Startup Diagnostics</Text>

      <Section title="App">
        <Row label="Package" value={app.packageName ?? "—"} />
        <Row label="Version" value={`${app.version} (${app.versionCode})`} />
        <Row label="Commit" value={app.commit} />
        <Row label="Environment" value={app.environment} />
        <Row label="Build Date" value={app.buildDate ?? "—"} />
      </Section>

      <Section title="Device">
        <Row label="Manufacturer" value={device.manufacturer} />
        <Row label="Model" value={device.model} />
        <Row label="Android" value={device.androidVersion} />
        <Row label="SDK" value={String(device.sdk)} />
        <Row label="Screen" value={device.screen ?? "—"} />
        <Row label="Locale" value={device.locale} />
      </Section>

      <Section title="Network">
        <Row label="Type" value={diagnostics?.network.type ?? "—"} />
        <Row label="Reachable" value={diagnostics?.network.reachable ? "yes" : "no"} />
        <Row label="Latency" value={diagnostics?.connectivity?.latencyMs ? `${diagnostics.connectivity.latencyMs} ms` : "—"} />
        <Row label="API" value={diagnostics?.connectivity?.api.ok ? "✓" : diagnostics ? "✗" : "—"} />
      </Section>

      <Section title="Startup">
        <Row label="Boot ID" value={report?.bootId ?? getCurrentBootId()} />
        <Row label="Success" value={report ? (report.success ? "yes" : "no") : "—"} />
        <Row label="Duration" value={report ? `${report.durationMs}ms` : "—"} />
        <Row label="Retry" value={report ? String(report.retryCount) : "—"} />
        <Row label="Stage" value={failure ? BOOT_STAGE_LABELS[failure.stage] : "—"} />
      </Section>

      <Section title="Telemetry">
        <Row label="Correlation" value={report?.bootId ?? getCurrentBootId()} />
        <Row label="Last event" value={report?.success ? "BOOT_COMPLETED" : failure ? "BOOT_FAILED" : "—"} />
      </Section>

      <Section title="Timeline">
        <Text style={styles.timeline}>{timeline || "—"}</Text>
      </Section>

      <Section title="History">
        {history.length === 0 ? <Text style={styles.rowValue}>—</Text> : null}
        {history.map((entry) => (
          <Text key={entry.bootId + entry.time} style={styles.historyLine}>
            {formatHistoryEntry(entry)}
          </Text>
        ))}
      </Section>

      <Section title="Export">
        <PrimaryButton label="Copy" onPress={() => diagnostics && void copyDiagnosticsText(diagnostics)} disabled={!diagnostics} fullWidth />
        <SecondaryButton label="Export JSON" onPress={() => diagnostics && void exportDiagnosticsJson(diagnostics)} disabled={!diagnostics} fullWidth />
      </Section>

      <Section title="Stage durations">
        <Row label="Bootstrap" value={stageLine(report, BootStage.BOOTSTRAP)} />
        <Row label="Remote Config" value={stageLine(report, BootStage.REMOTE_CONFIG)} />
        <Row label="Update" value={stageLine(report, BootStage.UPDATE)} />
        <Row label="Session" value={stageLine(report, BootStage.SESSION)} />
        <Row label="Navigation" value={stageLine(report, BootStage.NAVIGATION)} />
      </Section>
    </ScrollView>
  );
}

function stageLine(report: StartupReport | null, stage: BootStage): string {
  const entry = report?.stages.find((s) => s.stage === stage);
  if (!entry) return "—";
  return `${entry.status} · ${entry.durationMs}ms${entry.message ? ` · ${entry.message}` : ""}`;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: surface.background },
  title: { ...typography.h2, color: text.primary },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: brand.primary },
  row: { gap: 2 },
  rowLabel: { ...typography.caption, color: text.muted },
  rowValue: { ...typography.body, color: text.primary },
  timeline: { ...typography.caption, color: text.primary, fontFamily: "monospace", lineHeight: 20 },
  historyLine: { ...typography.caption, color: text.secondary, marginBottom: spacing.xs },
});
