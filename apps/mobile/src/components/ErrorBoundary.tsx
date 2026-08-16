import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../theme/tokens";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Что-то пошло не так</Text>
          <Text style={styles.body}>{this.state.error.message}</Text>
          <Pressable style={styles.button} onPress={() => this.setState({ error: null })}>
            <Text style={styles.buttonText}>Попробовать снова</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, backgroundColor: colors.white },
  title: { ...typography.title, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.gray500, textAlign: "center", marginBottom: spacing.lg },
  button: { backgroundColor: colors.orange, minHeight: 48, borderRadius: 12, paddingHorizontal: spacing.lg, justifyContent: "center" },
  buttonText: { color: colors.white, ...typography.subtitle },
});
