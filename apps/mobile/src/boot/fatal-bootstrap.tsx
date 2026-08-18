import React from "react";
import { AppRegistry, ScrollView, StyleSheet, Text, View } from "react-native";

import { getBootMarks, getFatalStartupError } from "./early-boot";

/** Minimal fatal UI — only react-native + early-boot (no design system imports). */
function FatalBootstrapRoot() {
  const error = getFatalStartupError();
  const bootMarks = getBootMarks();

  if (!error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Startup Fatal Error</Text>
        <Text style={styles.body}>Unknown startup failure before Expo Router loaded.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>Startup Fatal Error</Text>
      <Text style={styles.subtitle}>Приложение перехватило исключение при запуске и не закрылось.</Text>

      <View style={styles.block}>
        <Text style={styles.label}>Исключение</Text>
        <Text style={styles.value}>
          {error.name}: {error.message}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Stack trace</Text>
        <Text style={styles.mono} selectable>
          {error.stack ?? "Stack trace unavailable"}
        </Text>
      </View>

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
    </ScrollView>
  );
}

export function registerFatalBootstrap(): void {
  AppRegistry.registerComponent("main", () => FatalBootstrapRoot);
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#DC2626", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#374151", textAlign: "center" },
  block: { gap: 8, padding: 16, borderRadius: 12, backgroundColor: "#F3F4F6" },
  label: { fontSize: 12, color: "#6B7280", textTransform: "uppercase" },
  value: { fontSize: 16, color: "#111827" },
  mono: { fontSize: 12, color: "#111827", fontFamily: "monospace" },
  bootLine: { fontSize: 12, color: "#374151", fontFamily: "monospace" },
  body: { fontSize: 16, color: "#374151", textAlign: "center" },
});
