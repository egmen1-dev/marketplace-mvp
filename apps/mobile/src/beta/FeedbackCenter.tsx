import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { submitProductFeedback } from "../api/endpoints";
import { PrimaryButton, SecondaryButton } from "../components/ui";
import { getBetaEnvironment } from "./environment";
import { getBuildInfo } from "./build-info";
import { getNavigationPath } from "./session-recorder";
import { FEEDBACK_CATEGORIES, type BetaFeedbackCategory } from "./feedback-types";
import { colors, spacing, typography } from "../theme/tokens";

type Props = {
  screen: string;
  onClose?: () => void;
};

export function FeedbackCenter({ screen, onClose }: Props) {
  const [category, setCategory] = useState<BetaFeedbackCategory>("bug_report");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit() {
    if (!message.trim()) return;
    setStatus("sending");
    const env = getBetaEnvironment();
    const build = getBuildInfo();
    const metadata = {
      device: env.deviceModel,
      os: env.platform,
      version: build.appVersion,
      build: build.buildNumber,
      screen,
      navigationPath: getNavigationPath(),
      channel: build.channel,
      commitSha: build.commitSha,
    };

    try {
      await submitProductFeedback({
        content: message.trim(),
        screen,
        category,
        metadata,
      });
      setStatus("sent");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Центр обратной связи</Text>
      <Text style={styles.subtitle}>Помогите улучшить ЛОТ перед публичным запуском</Text>

      <Text style={styles.label}>Тип сообщения</Text>
      <View style={styles.chips}>
        {FEEDBACK_CATEGORIES.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.chip, category === item.id && styles.chipActive]}
            onPress={() => setCategory(item.id)}
          >
            <Text style={[styles.chipText, category === item.id && styles.chipTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Описание</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={5}
        placeholder="Что произошло? Что вы ожидали?"
        value={message}
        onChangeText={setMessage}
        textAlignVertical="top"
      />

      <Text style={styles.hint}>
        Автоматически: устройство, ОС, версия, сборка, экран, путь навигации
      </Text>

      {status === "sent" && <Text style={styles.success}>Отправлено. Спасибо!</Text>}
      {status === "error" && <Text style={styles.error}>Не удалось отправить. Попробуйте позже.</Text>}

      <View style={styles.actions}>
        <PrimaryButton label={status === "sending" ? "Отправка…" : "Отправить"} onPress={onSubmit} />
        {onClose ? <SecondaryButton label="Закрыть" onPress={onClose} /> : null}
      </View>
      {status === "sending" && <ActivityIndicator style={styles.loader} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.title },
  subtitle: { ...typography.body, color: colors.gray500, marginBottom: spacing.md },
  label: { ...typography.subtitle, marginTop: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { ...typography.caption, color: colors.gray700 },
  chipTextActive: { color: colors.white },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 120,
    ...typography.body,
  },
  hint: { ...typography.caption, color: colors.gray500 },
  success: { color: "#27ae60", ...typography.body },
  error: { color: "#c0392b", ...typography.body },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  loader: { marginTop: spacing.sm },
});
