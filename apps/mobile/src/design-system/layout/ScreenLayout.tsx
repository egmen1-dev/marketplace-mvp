import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View, type ScrollViewProps, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export function PageContainer({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.page, style]} {...rest}>
      {children}
    </View>
  );
}

export function PageScroll({ children, contentContainerStyle, ...rest }: ScrollViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Text style={styles.sectionAction} onPress={onAction}>
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  scrollContent: { padding: spacing.lg, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  headerTitle: { ...typography.h1, color: colors.black },
  headerSubtitle: { ...typography.caption, color: colors.gray500 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { ...typography.h2, color: colors.black },
  sectionAction: { ...typography.caption, color: colors.orange, fontWeight: "600" },
});
