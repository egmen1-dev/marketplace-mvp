import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import type { MobileUpdateInfo } from "../api/endpoints";
import { postTelemetry } from "../api/endpoints";
import { PrimaryButton, SecondaryButton } from "../components/ui";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { getUpdateErrorMessage, startApkDownload } from "../update/download-apk";
import { saveUpdateDefer } from "../update/update-defer-storage";
import { UPDATE_ANALYTICS, type MobileUpdateState } from "../update/types";

type Props = {
  info: MobileUpdateInfo;
  visible: boolean;
  onDismiss: () => void;
};

function titleForState(state: MobileUpdateState, versionName: string) {
  if (state === "REQUIRED_UPDATE") return "Эта версия ЛОТ больше не поддерживается";
  return `Доступна новая версия ЛОТ\n\n${versionName}`;
}

export function UpdateGate({ info, visible, onDismiss }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const required = info.updateState === "REQUIRED_UPDATE";
  const dismissible = !required;

  async function onUpdate() {
    setBusy(true);
    setError(null);
    const result = await startApkDownload(info);
    setBusy(false);
    if (!result.ok) {
      setError(getUpdateErrorMessage(result.code));
      return;
    }
  }

  async function onLater() {
    await postTelemetry({
      screen: "update",
      event: UPDATE_ANALYTICS.deferred,
      errorCode: info.versionName,
    });
    await saveUpdateDefer(info.versionCode);
    onDismiss();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismissible ? onDismiss : undefined}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{titleForState(info.updateState, info.versionName)}</Text>
          {required ? (
            <Text style={styles.body}>Чтобы продолжить работу, обновите приложение.</Text>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Что нового:</Text>
              <ScrollView style={styles.notesScroll} nestedScrollEnabled>
                {(info.releaseNotes.length ? info.releaseNotes : ["Улучшения стабильности и UX"]).map((line) => (
                  <Text key={line} style={styles.noteLine}>
                    • {line}
                  </Text>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.hint}>
            Чтобы обновить ЛОТ, Android попросит разрешить установку обновления из этого источника.
          </Text>

          {info.sha256 ? (
            <Text style={styles.sha} selectable>
              SHA256: {info.sha256.slice(0, 16)}…
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Обновить" fullWidth onPress={onUpdate} loading={busy} />
          {dismissible ? <SecondaryButton label="Позже" fullWidth onPress={onLater} /> : null}
          {!dismissible ? null : (
            <Pressable onPress={onDismiss} style={styles.dismissHit}>
              <Text style={styles.dismissText}> </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: "85%",
  },
  title: { ...typography.h2, color: colors.black },
  body: { ...typography.body, color: colors.gray700 },
  sectionLabel: { ...typography.subtitle, color: colors.gray900 },
  notesScroll: { maxHeight: 120 },
  noteLine: { ...typography.body, color: colors.gray700, marginBottom: spacing.xs },
  hint: { ...typography.caption, color: colors.gray500 },
  sha: { ...typography.caption, color: colors.gray500, fontFamily: "monospace" },
  error: { ...typography.caption, color: colors.danger },
  dismissHit: { height: 1 },
  dismissText: { height: 1 },
});
