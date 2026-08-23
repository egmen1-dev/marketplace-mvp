import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Network from "expo-network";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useAppStore } from "../store/app-store";
import { colors, spacing, typography } from "../theme/tokens";

export function NetworkBanner() {
  const offline = useAppStore((s) => s.offline);
  const bootDegraded = useAppStore((s) => s.bootDegraded);
  const setOffline = useAppStore((s) => s.setOffline);
  const setBootDegraded = useAppStore((s) => s.setBootDegraded);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const state = await Network.getNetworkStateAsync();
      if (!cancelled) {
        const isOffline = !state.isConnected;
        setOffline(isOffline);
        if (!isOffline && bootDegraded) {
          setBootDegraded(false);
        }
      }
    }
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [bootDegraded, setBootDegraded, setOffline]);

  if (!offline && !bootDegraded) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <MaterialCommunityIcons name={offline ? "wifi-off" : "cloud-alert-outline"} size={16} color={colors.white} />
      <Text style={styles.text}>
        {offline
          ? "Нет соединения. Показываем последние доступные данные."
          : "Сервер временно недоступен. Показываем последние доступные данные."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.black,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  text: { ...typography.caption, color: colors.white, fontWeight: "600", flexShrink: 1 },
});
