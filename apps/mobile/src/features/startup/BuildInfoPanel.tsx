import { StyleSheet, Text, View } from "react-native";

import { formatBuildDate, getMobileBuildInfo } from "../../config/build-info";
import { border, surface, text } from "../../design-system/tokens/colors";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

type Props = {
  compact?: boolean;
};

export function BuildInfoPanel({ compact }: Props) {
  const info = getMobileBuildInfo();

  return (
    <View style={[styles.panel, compact ? styles.panelCompact : null]} accessibilityRole="summary" accessibilityLabel="Build metadata">
      <Text style={styles.title}>Build Info</Text>
      <Row label="Version" value={info.versionName} />
      <Row label="VersionCode" value={String(info.versionCode)} />
      <Row label="Commit" value={info.commit} />
      <Row label="Git SHA" value={info.gitSha.length > 12 ? `${info.gitSha.slice(0, 12)}…` : info.gitSha} />
      <Row label="Build Date" value={formatBuildDate(info.buildDate)} />
      <Row label="Environment" value={info.environment} />
      {!compact ? <Row label="Branch" value={info.branch} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.default,
  },
  panelCompact: {
    backgroundColor: surface.backgroundMuted,
  },
  title: { ...typography.caption, color: text.muted, textTransform: "uppercase", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, minHeight: 28, alignItems: "center" },
  rowLabel: { ...typography.caption, color: text.muted, flex: 1 },
  rowValue: { ...typography.body, color: text.primary, fontWeight: "600", flex: 1.2, textAlign: "right" },
});
