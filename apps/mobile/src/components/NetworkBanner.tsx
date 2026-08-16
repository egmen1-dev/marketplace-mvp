import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Network from "expo-network";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

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
      <MaterialCommunityIcons name="wifi-off" size={16} color={colors.white} />
      <Text style={styles.text}>Нет подключения к интернету</Text>
      <Text style={styles.subtext}>Некоторые данные могут быть неактуальны</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.black,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  text: { ...typography.caption, color: colors.white, fontWeight: "600" },
  subtext: { ...typography.caption, color: colors.gray300, fontSize: 11 },
});
