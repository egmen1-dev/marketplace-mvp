import { StyleSheet, Text, View } from "react-native";

import { formatBuildDate, getMobileBuildInfo } from "../../config/build-info";
import { colors, radii, spacing, typography } from "../../theme/tokens";

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
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  panelCompact: {
    backgroundColor: colors.gray100,
  },
  title: { ...typography.caption, color: colors.gray500, textTransform: "uppercase", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, minHeight: 28, alignItems: "center" },
  rowLabel: { ...typography.caption, color: colors.gray500, flex: 1 },
  rowValue: { ...typography.body, color: colors.black, fontWeight: "600", flex: 1.2, textAlign: "right" },
});
