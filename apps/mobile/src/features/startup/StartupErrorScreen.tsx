import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";

import type { BootFailure } from "../../boot/boot-types";
import { BOOT_STAGE_LABELS } from "../../boot/boot-types";
import { loadLastStartupReport } from "../../boot/boot-storage";
import { getBootFailurePresentation } from "../../../../../lib/mobile/diagnostics/types";
import type { ConnectivityCheckResult, DiagnosticsReport } from "../../../../../lib/mobile/diagnostics/types";
import { PrimaryButton, SecondaryButton } from "../../components/ui";
import { buildDiagnosticsReport } from "../../diagnostics/diagnostics-service";
import { copyDiagnosticsText, exportDiagnosticsJson, shareProblemReport } from "../../diagnostics/diagnostics-actions";
import { runConnectivityCheck } from "../../diagnostics/connectivity-check";
import { BuildInfoPanel } from "./BuildInfoPanel";
import { StartupBuildStamp } from "./StartupBuildStamp";
import { brand, border, semantic, surface, text } from "../../design-system/tokens/colors";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";

type Props = {
  failure: BootFailure;
  bootId: string;
  retryCount: number;
  onRetry: () => void;
};

function ConnectivityPanel({ check }: { check: ConnectivityCheckResult | null }) {
  if (!check) {
    return (
      <View style={styles.connectivity}>
        <ActivityIndicator size="small" color={brand.primary} />
        <Text style={styles.connectivityHint}>Проверка соединения…</Text>
      </View>
    );
  }

  const rows = [
    { label: "Интернет", ok: check.internet.ok },
    { label: "API", ok: check.api.ok },
    { label: "Railway", ok: check.railway.ok },
    { label: "DNS", ok: check.dns.ok },
  ];

  return (
    <View style={styles.connectivity}>
      {rows.map((row) => (
        <View key={row.label} style={styles.connectRow}>
          <Text style={styles.connectLabel}>{row.label}</Text>
          <Text style={[styles.connectValue, row.ok ? styles.connectOk : styles.connectFail]}>{row.ok ? "✓" : "✗"}</Text>
        </View>
      ))}
      {check.latencyMs !== undefined ? (
        <View style={styles.connectRow}>
          <Text style={styles.connectLabel}>Latency</Text>
          <Text style={styles.connectValue}>{check.latencyMs} ms</Text>
        </View>
      ) : null}
    </View>
  );
}

export function StartupErrorScreen({ failure, bootId, retryCount, onRetry }: Props) {
  const presentation = useMemo(() => getBootFailurePresentation(failure), [failure]);
  const stageLabel = BOOT_STAGE_LABELS[failure.stage];
  const [connectivity, setConnectivity] = useState<ConnectivityCheckResult | null>(null);
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const check = await runConnectivityCheck();
      if (cancelled) return;
      setConnectivity(check);
      const startupReport = await loadLastStartupReport();
      const built = await buildDiagnosticsReport({
        bootId,
        retryCount,
        failure,
        startupReport,
        includeConnectivity: false,
      });
      built.connectivity = check;
      if (!cancelled) setReport({ ...built, connectivity: check });
    })();
    return () => {
      cancelled = true;
    };
  }, [bootId, retryCount, failure]);

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.heading}>{presentation.title}</Text>
      <Text style={styles.subheading}>{presentation.subtitle}</Text>

      <View style={styles.block}>
        <Text style={styles.label}>Startup ID</Text>
        <Text style={styles.mono}>{bootId}</Text>
      </View>

      <ConnectivityPanel check={connectivity} />

      <View style={styles.block}>
        <Text style={styles.label}>Этап</Text>
        <Text style={styles.value}>{stageLabel}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Причина</Text>
        <Text style={styles.value}>{failure.message}</Text>
      </View>

      {failure.httpStatus ? (
        <View style={styles.block}>
          <Text style={styles.label}>HTTP</Text>
          <Text style={styles.value}>{failure.httpStatus}</Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.label}>Код</Text>
        <Text style={styles.mono}>{failure.code}</Text>
      </View>

      <BuildInfoPanel compact />

      <PrimaryButton label="Повторить" onPress={onRetry} fullWidth />

      <SecondaryButton
        label="Скопировать диагностику"
        onPress={() => report && void copyDiagnosticsText(report)}
        fullWidth
        disabled={!report}
      />
      <SecondaryButton
        label="Экспортировать отчёт"
        onPress={() => report && void exportDiagnosticsJson(report)}
        fullWidth
        disabled={!report}
      />
      <SecondaryButton
        label="Сообщить о проблеме"
        onPress={() => setShowReportForm((v) => !v)}
        fullWidth
        disabled={!report}
      />

      {showReportForm ? (
        <View style={styles.reportForm}>
          <Text style={styles.label}>Что произошло?</Text>
          <TextInput
            style={styles.reportInput}
            multiline
            placeholder="Опишите проблему своими словами"
            value={reportNote}
            onChangeText={setReportNote}
          />
          <PrimaryButton
            label="Отправить отчёт"
            onPress={() => report && void shareProblemReport(report, reportNote)}
            fullWidth
          />
        </View>
      ) : null}

      <StartupBuildStamp />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 360,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: surface.backgroundMuted,
  },
  heading: { ...typography.h2, color: semantic.danger, textAlign: "center" },
  subheading: { ...typography.body, color: text.secondary, textAlign: "center" },
  block: { gap: spacing.xs },
  label: { ...typography.caption, color: text.muted, textTransform: "uppercase" },
  value: { ...typography.body, color: text.primary },
  mono: { ...typography.caption, color: text.secondary, fontFamily: "monospace" },
  connectivity: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: surface.background,
    borderWidth: 1,
    borderColor: border.default,
  },
  connectivityHint: { ...typography.caption, color: text.muted },
  connectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 28 },
  connectLabel: { ...typography.body, color: text.primary },
  connectValue: { ...typography.body, fontWeight: "700" },
  connectOk: { color: semantic.success },
  connectFail: { color: semantic.danger },
  reportForm: { gap: spacing.sm },
  reportInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: surface.background,
    ...typography.body,
    textAlignVertical: "top",
  },
});
