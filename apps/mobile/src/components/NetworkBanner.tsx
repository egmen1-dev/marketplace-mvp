import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Network from "expo-network";

import { useAppStore } from "../store/app-store";
import { colors, spacing, typography } from "../theme/tokens";

export function NetworkBanner() {
  const offline = useAppStore((s) => s.offline);
  const setOffline = useAppStore((s) => s.setOffline);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const state = await Network.getNetworkStateAsync();
      if (!cancelled) setOffline(!state.isConnected);
    }
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [setOffline]);

  if (!offline) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>Нет сети — показаны сохранённые данные где возможно</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.black, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  text: { ...typography.caption, color: colors.white, textAlign: "center" },
});
