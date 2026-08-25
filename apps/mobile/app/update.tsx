import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GhostButton, PrimaryButton, SecondaryButton } from "../src/components/ui";
import { useUpdateCheckFlow } from "../src/hooks/useUpdateCheckFlow";
import { UPDATE_UI_LABELS } from "../src/update/update-ui-labels";
import { colors, radii, spacing, typography } from "../src/theme/tokens";

export default function UpdateCheckScreen() {
  const {
    buildInfo,
    phase,
    updateInfo,
    errorMessage,
    hasUpdate,
    hasCachedApk,
    needsUnknownSources,
    checkForUpdate,
    downloadUpdate,
    openUnknownSourcesSettings,
  } = useUpdateCheckFlow();

  const rcLabel = process.env.EXPO_PUBLIC_RC_LABEL ?? "RC8";
  const primaryLabel =
    phase === "downloading"
      ? UPDATE_UI_LABELS.downloading
      : phase === "ready_to_install" || hasCachedApk
        ? UPDATE_UI_LABELS.installCta
        : UPDATE_UI_LABELS.downloadCta;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {phase === "checking" ? <Text style={styles.title}>{UPDATE_UI_LABELS.checking}</Text> : null}

        {phase === "up_to_date" ? (
          <>
            <Text style={styles.title}>{UPDATE_UI_LABELS.upToDate}</Text>
            <Text style={styles.body}>
              {buildInfo.appVersion} (код {buildInfo.buildNumber})
            </Text>
          </>
        ) : null}

        {phase === "available" && updateInfo ? (
          <>
            <Text style={styles.title}>{UPDATE_UI_LABELS.available}</Text>
            <Text style={styles.body}>Версия {updateInfo.versionName}</Text>
            <PrimaryButton label={primaryLabel} onPress={downloadUpdate} fullWidth />
          </>
        ) : null}

        {phase === "downloading" ? (
          <>
            <Text style={styles.title}>{UPDATE_UI_LABELS.downloading}</Text>
            <Text style={styles.hint}>Не закрывайте приложение до завершения загрузки.</Text>
          </>
        ) : null}

        {phase === "ready_to_install" && updateInfo ? (
          <>
            <Text style={styles.title}>{hasCachedApk ? UPDATE_UI_LABELS.alreadyDownloaded : UPDATE_UI_LABELS.readyToInstall}</Text>
            <Text style={styles.body}>Версия {updateInfo.versionName}</Text>
            <PrimaryButton label={UPDATE_UI_LABELS.installCta} onPress={downloadUpdate} fullWidth />
          </>
        ) : null}

        {phase === "installer_opened" ? (
          <>
            <Text style={styles.title}>{UPDATE_UI_LABELS.installerOpened}</Text>
            <Text style={styles.hint}>После установки откройте ЛОТ снова и проверьте версию в профиле.</Text>
          </>
        ) : null}

        {phase === "failed" ? (
          <>
            <Text style={styles.title}>{errorMessage ?? UPDATE_UI_LABELS.installFailed}</Text>
            <GhostButton label={UPDATE_UI_LABELS.retry} onPress={checkForUpdate} fullWidth />
            {needsUnknownSources ? (
              <SecondaryButton label={UPDATE_UI_LABELS.allowInstallCta} onPress={openUnknownSourcesSettings} fullWidth />
            ) : null}
          </>
        ) : null}

        {hasUpdate && phase !== "available" && phase !== "downloading" && phase !== "ready_to_install" && updateInfo ? (
          <View style={styles.availableHint}>
            <Text style={styles.body}>
              {UPDATE_UI_LABELS.available}: {updateInfo.versionName}
            </Text>
            <PrimaryButton label={primaryLabel} onPress={downloadUpdate} fullWidth />
          </View>
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
  availableHint: { gap: spacing.sm, marginTop: spacing.sm },
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
