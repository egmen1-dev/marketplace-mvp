import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../src/theme/tokens";

/** Alpha checkout uses backend contract; payment provider may be staging-only. */
export default function CheckoutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Оформление заказа</Text>
      <Text style={styles.body}>
        Alpha использует backend checkout contract. Полный российский payment provider ещё не production-ready — на staging
        доступен demo flow через web или будущий APP-SHELL-1 payment path.
      </Text>
      <Text style={styles.hint}>Financial Engine не дублируется в mobile client.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.title },
  body: { ...typography.body, color: colors.gray900 },
  hint: { ...typography.caption, color: colors.gray500 },
});
