import { Linking, StyleSheet, Text, View } from "react-native";

import type { MobileUpdateInfo } from "../api/endpoints";
import { postTelemetry } from "../api/endpoints";
import { PrimaryButton } from "../design-system/forms/buttons";
import { startApkDownload } from "../update/download-apk";
import { colors, spacing, typography } from "../theme/tokens";

type Props = {
  update: MobileUpdateInfo;
};

export function UnsupportedClientScreen({ update }: Props) {
  const targetVersion = update.minimumVersionName ?? update.versionName;

  async function onDownload() {
    await postTelemetry({
      screen: "unsupported",
      event: "unsupported_client_download",
      errorCode: targetVersion,
    }).catch(() => null);

    const result = await startApkDownload(update);
    if (result.ok && update.downloadUrl) {
      await Linking.openURL(update.downloadUrl).catch(() => null);
    }
  }

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>Эта версия ЛОТ больше не поддерживается.</Text>
      <Text style={styles.body}>Установите последнюю версию приложения.</Text>
      {targetVersion ? <Text style={styles.version}>Минимальная версия: {targetVersion}</Text> : null}
      <PrimaryButton label="Скачать новую версию" onPress={onDownload} fullWidth />
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
});
