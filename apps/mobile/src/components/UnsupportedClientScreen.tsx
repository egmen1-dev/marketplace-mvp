import { StyleSheet, Text, View } from "react-native";

import type { MobileUpdateInfo } from "../api/endpoints";
import { postTelemetry } from "../api/endpoints";
import { PrimaryButton, SecondaryButton } from "./ui";
import { getUpdateErrorMessage, openUnknownSourcesSettings, startApkDownload } from "../update/download-apk";
import { colors, spacing, typography } from "../theme/tokens";
import { UPDATE_UI_LABELS } from "../update/update-ui-labels";
import { useState } from "react";

type Props = {
  update: MobileUpdateInfo;
};

export function UnsupportedClientScreen({ update }: Props) {
  const targetVersion = update.minimumVersionName ?? update.versionName;
  const [error, setError] = useState<string | null>(null);
  const [needsUnknownSources, setNeedsUnknownSources] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onDownload() {
    setBusy(true);
    setError(null);
    setNeedsUnknownSources(false);
    await postTelemetry({
      screen: "unsupported",
      event: "unsupported_client_download",
      errorCode: targetVersion,
    }).catch(() => null);

    const result = await startApkDownload(update);
    setBusy(false);
    if (!result.ok) {
      setError(getUpdateErrorMessage(result.code));
      setNeedsUnknownSources(Boolean(result.needsUnknownSources));
    }
  }

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>Эта версия ЛОТ больше не поддерживается.</Text>
      <Text style={styles.body}>Установите последнюю версию приложения.</Text>
      {targetVersion ? <Text style={styles.version}>Минимальная версия: {targetVersion}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Скачать новую версию" onPress={onDownload} fullWidth loading={busy} />
      {needsUnknownSources ? (
        <SecondaryButton label={UPDATE_UI_LABELS.allowInstallCta} onPress={openUnknownSourcesSettings} fullWidth />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { ...typography.h2, color: colors.black, textAlign: "center" },
  body: { ...typography.body, color: colors.gray700, textAlign: "center" },
  version: { ...typography.caption, color: colors.gray500, textAlign: "center" },
  error: { ...typography.caption, color: colors.danger, textAlign: "center" },
});
