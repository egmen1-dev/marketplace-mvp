import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GhostButton, PrimaryButton, SecondaryButton } from "../src/components/ui";
import { useUpdateCheckFlow } from "../src/hooks/useUpdateCheckFlow";
import { UPDATE_UI_LABELS } from "../src/update/update-ui-labels";
import { colors, radii, spacing, typography } from "../src/theme/tokens";

export default function UpdateCheckScreen() {
  const {
    buildInfo,
    ui,
    updateInfo,
    needsUnknownSources,
    checkForUpdate,
    downloadUpdate,
    openUnknownSourcesSettings,
  } = useUpdateCheckFlow();

  const rcLabel = process.env.EXPO_PUBLIC_RC_LABEL ?? "RC8";
  const primaryLabel =
    ui.showDownloading
      ? UPDATE_UI_LABELS.downloading
      : ui.showReadyToInstall || ui.showInstallCta
        ? UPDATE_UI_LABELS.installCta
        : UPDATE_UI_LABELS.downloadCta;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {ui.showChecking ? <Text style={styles.title}>{UPDATE_UI_LABELS.checking}</Text> : null}

        {ui.showUpToDate ? (
          <>
            <Text style={styles.title}>{UPDATE_UI_LABELS.upToDate}</Text>
            <Text style={styles.body}>
              {buildInfo.appVersion} (код {buildInfo.buildNumber})
            </Text>
          </>
        ) : null}

        {ui.showUpdateAvailable && updateInfo ? (
          <>
            <Text style={styles.title}>{UPDATE_UI_LABELS.available}</Text>
            <Text style={styles.body}>Версия {updateInfo.versionName}</Text>
            <PrimaryButton label={primaryLabel} onPress={downloadUpdate} fullWidth />
          </>
        ) : null}

        {ui.showDownloading ? (
          <>
            <Text style={styles.title}>{UPDATE_UI_LABELS.downloading}</Text>
            <Text style={styles.hint}>Не закрывайте приложение до завершения загрузки.</Text>
          </>
        ) : null}

        {ui.showReadyToInstall && updateInfo ? (
          <>
            <Text style={styles.title}>{UPDATE_UI_LABELS.readyToInstall}</Text>
            <Text style={styles.body}>Версия {updateInfo.versionName}</Text>
            <PrimaryButton label={UPDATE_UI_LABELS.installCta} onPress={downloadUpdate} fullWidth />
          </>
        ) : null}

        {ui.showInstallerOpened ? (
          <>
            <Text style={styles.title}>{UPDATE_UI_LABELS.installerOpened}</Text>
            <Text style={styles.hint}>После установки откройте ЛОТ снова и проверьте версию в профиле.</Text>
          </>
        ) : null}

        {ui.showCheckError ? (
          <>
            <Text style={styles.title}>{ui.errorTitle ?? UPDATE_UI_LABELS.checkFailed}</Text>
            <GhostButton label={UPDATE_UI_LABELS.retry} onPress={checkForUpdate} fullWidth />
          </>
        ) : null}

        {ui.showDownloadError ? (
          <>
            <Text style={styles.title}>{ui.errorTitle ?? UPDATE_UI_LABELS.downloadFailed}</Text>
            <GhostButton label={UPDATE_UI_LABELS.retry} onPress={downloadUpdate} fullWidth />
          </>
        ) : null}

        {ui.showVerifyError ? (
          <>
            <Text style={styles.title}>{ui.errorTitle ?? UPDATE_UI_LABELS.verifyFailed}</Text>
            <GhostButton label={UPDATE_UI_LABELS.retry} onPress={downloadUpdate} fullWidth />
          </>
        ) : null}

        {ui.showInstallError ? (
          <>
            <Text style={styles.title}>{ui.errorTitle ?? UPDATE_UI_LABELS.installHandoffFailed}</Text>
            <GhostButton label={UPDATE_UI_LABELS.retry} onPress={downloadUpdate} fullWidth />
            {needsUnknownSources ? (
              <SecondaryButton label={UPDATE_UI_LABELS.allowInstallCta} onPress={openUnknownSourcesSettings} fullWidth />
            ) : null}
          </>
        ) : null}
      </View>

      <View style={styles.identityCard}>
        <Text style={styles.identityTitle}>
          ЛОТ {buildInfo.appVersion} ({buildInfo.buildNumber})
        </Text>
        <Text style={styles.identityMeta}>
          {rcLabel} · {buildInfo.channel}
          {"\n"}SHA {buildInfo.commitSha.slice(0, 7)}
          {"\n"}
          {buildInfo.environment}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.gray100 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  title: { ...typography.h2, color: colors.black },
  body: { ...typography.body, color: colors.gray700 },
  hint: { ...typography.caption, color: colors.gray500 },
  identityCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  identityTitle: { ...typography.h3, color: colors.black },
  identityMeta: { ...typography.caption, color: colors.gray500, lineHeight: 20 },
});
