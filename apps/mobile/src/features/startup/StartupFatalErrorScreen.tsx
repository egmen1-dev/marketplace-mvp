import * as Clipboard from "expo-clipboard";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getBootMarks,
  getFatalCrashId,
  getFatalStage,
} from "../../boot/early-boot";
import { getMobileBuildInfo } from "../../config/build-info";
import { StartupBuildStamp } from "./StartupBuildStamp";
import { PrimaryButton, SecondaryButton } from "../../components/ui";
import { brand, semantic, surface, text } from "../../design-system/tokens/colors";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";

type Props = {
  error: Error;
  componentStack?: string | null;
  onRetry?: () => void;
};

export function StartupFatalErrorScreen({ error, componentStack, onRetry }: Props) {
  const bootMarks = getBootMarks();
  const stack = error.stack ?? componentStack ?? "Stack trace unavailable";
  const build = getMobileBuildInfo();
  const crashId = getFatalCrashId() ?? `crash-${Date.now().toString(36)}`;
  const stage = getFatalStage();

  const diagnosticsText = [
    `Startup Fatal Error`,
    `Crash ID: ${crashId}`,
    `Stage: ${stage}`,
    `Exception: ${error.name}: ${error.message}`,
    `Version: ${build.versionName} (${build.versionCode})`,
    `Commit: ${build.gitSha}`,
    `Build: ${build.buildDate}`,
    ``,
    `Stack trace:`,
    stack,
    componentStack ? `\nComponent stack:\n${componentStack}` : "",
    bootMarks.length ? `\nBoot trail:\n${bootMarks.join("\n")}` : "",
  ].join("\n");

  const copyDiagnostics = async () => {
    await Clipboard.setStringAsync(diagnosticsText);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>Startup Fatal Error</Text>
      <Text style={styles.subtitle}>
        JS recovery layer перехватил исключение. Native crash до загрузки bundle не перехватывается.
      </Text>

      <View style={styles.block}>
        <Text style={styles.label}>Crash ID</Text>
        <Text style={styles.value}>{crashId}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Stage</Text>
        <Text style={styles.value}>{stage}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Исключение</Text>
        <Text style={styles.value}>
          {error.name}: {error.message}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Stack trace</Text>
        <Text style={styles.mono} selectable>
          {stack}
        </Text>
      </View>

      {componentStack ? (
        <View style={styles.block}>
          <Text style={styles.label}>Component stack</Text>
          <Text style={styles.mono} selectable>
            {componentStack}
          </Text>
        </View>
      ) : null}

      {bootMarks.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>Boot trail</Text>
          {bootMarks.map((line) => (
            <Text key={line} style={styles.bootLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <StartupBuildStamp />

      <SecondaryButton label="Копировать диагностику" onPress={copyDiagnostics} fullWidth />
      {onRetry ? <PrimaryButton label="Попробовать снова" onPress={onRetry} fullWidth /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: surface.background,
    justifyContent: "center",
  },
  title: { ...typography.h2, color: semantic.danger, textAlign: "center" },
  subtitle: { ...typography.body, color: text.secondary, textAlign: "center" },
  block: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: surface.backgroundMuted,
  },
  label: { ...typography.caption, color: text.muted, textTransform: "uppercase" },
  value: { ...typography.body, color: text.primary },
  mono: { ...typography.caption, color: text.primary, fontFamily: "monospace" },
  bootLine: { ...typography.caption, color: text.secondary, fontFamily: "monospace" },
});
