import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getBootMarks } from "../../boot/early-boot";
import { StartupBuildStamp } from "./StartupBuildStamp";
import { PrimaryButton } from "../../components/ui";
import { colors, radii, spacing, typography } from "../../theme/tokens";

type Props = {
  error: Error;
  componentStack?: string | null;
  onRetry?: () => void;
};

export function StartupFatalErrorScreen({ error, componentStack, onRetry }: Props) {
  const bootMarks = getBootMarks();
  const stack = error.stack ?? componentStack ?? "Stack trace unavailable";

  return (
    <ScrollView contentContainerStyle={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>Startup Fatal Error</Text>
      <Text style={styles.subtitle}>Приложение перехватило исключение при запуске и не закрылось.</Text>

      <View style={styles.block}>
        <Text style={styles.label}>Исключение</Text>
        <Text style={styles.value}>{error.name}: {error.message}</Text>
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

      {onRetry ? <PrimaryButton label="Попробовать снова" onPress={onRetry} fullWidth /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.white,
    justifyContent: "center",
  },
  title: { ...typography.title, color: colors.danger, textAlign: "center" },
  subtitle: { ...typography.body, color: colors.gray700, textAlign: "center" },
  block: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.gray100,
  },
  label: { ...typography.caption, color: colors.gray500, textTransform: "uppercase" },
  value: { ...typography.body, color: colors.black },
  mono: { ...typography.caption, color: colors.gray900, fontFamily: "monospace" },
  bootLine: { ...typography.caption, color: colors.gray700, fontFamily: "monospace" },
});
