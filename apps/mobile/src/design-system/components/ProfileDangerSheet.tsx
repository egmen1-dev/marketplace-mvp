import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { semantic, border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onClearCache: () => void;
};

export function ProfileDangerSheet({ visible, onClose, onLogout, onClearCache }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Опасная зона</Text>
        <Text style={styles.subtitle}>Действия ниже влияют на локальные данные и сессию.</Text>

        <Pressable style={styles.action} onPress={onClearCache} accessibilityRole="button">
          <Text style={styles.actionTitle}>Удалить локальный кэш</Text>
          <Text style={styles.actionBody}>Избранное, заказы, просмотры и диагностика на устройстве</Text>
        </Pressable>

        <Pressable style={[styles.action, styles.actionDanger]} onPress={onLogout} accessibilityRole="button">
          <Text style={[styles.actionTitle, styles.actionTitleDanger]}>Выйти из аккаунта</Text>
          <Text style={styles.actionBody}>Завершить сессию на этом устройстве</Text>
        </Pressable>

        <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
          <Text style={styles.cancelText}>Отмена</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17,17,17,0.45)" },
  sheet: {
    backgroundColor: surface.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: surface.backgroundMuted,
    marginBottom: spacing.xs,
  },
  title: { ...typography.h3, color: text.primary },
  subtitle: { ...typography.body, color: text.secondary },
  action: {
    backgroundColor: surface.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: border.default,
    minHeight: 44,
  },
  actionDanger: { borderColor: semantic.dangerSoft, backgroundColor: semantic.dangerSoft },
  actionTitle: { ...typography.body, color: text.primary, fontWeight: "700" },
  actionTitleDanger: { color: semantic.danger },
  actionBody: { ...typography.caption, color: text.muted },
  cancel: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  cancelText: { ...typography.body, color: text.secondary, fontWeight: "600" },
});
