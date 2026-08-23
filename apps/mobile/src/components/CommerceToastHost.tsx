import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "../theme/tokens";
import { useCommerceToastStore } from "../commerce/commerce-toast-store";

export function CommerceToastHost() {
  const insets = useSafeAreaInsets();
  const message = useCommerceToastStore((s) => s.message);
  const tone = useCommerceToastStore((s) => s.tone);
  const clear = useCommerceToastStore((s) => s.clear);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => clear(), 2400);
    return () => clearTimeout(timer);
  }, [message, clear]);

  if (!message) return null;

  const background =
    tone === "success" ? colors.successSoft : tone === "error" ? colors.dangerSoft : colors.gray100;

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      <Pressable style={[styles.banner, { backgroundColor: background }]} onPress={clear}>
        <Text style={styles.text}>{message}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 100 },
  banner: { borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.body },
  text: { color: colors.black, textAlign: "center", fontWeight: "600" },
});
