import { Linking, StyleSheet, Text, View } from "react-native";

import type { MobileUpdateInfo } from "../api/endpoints";
import { postTelemetry } from "../api/endpoints";
import { brand, surface, text } from "../design-system/tokens/colors";
import { spacing } from "../design-system/tokens/spacing";
import { typography } from "../design-system/tokens/typography";
import { startApkDownload } from "../update/download-apk";
import { PrimaryButton } from "./ui";

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
    backgroundColor: surface.background,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { ...typography.h2, color: text.primary, textAlign: "center" },
  body: { ...typography.body, color: text.secondary, textAlign: "center" },
  version: { ...typography.caption, color: text.muted, textAlign: "center" },
});
