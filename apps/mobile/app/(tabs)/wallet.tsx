import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { fetchWallet } from "../../src/api/endpoints";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function WalletScreen() {
  const [data, setData] = useState<{ spendable: number; withdrawable: number; pending: number; enabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.orange} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Кошелёк</Text>
      <Text style={styles.metric}>Доступно: {data?.spendable ?? 0} ₽</Text>
      <Text style={styles.metric}>К выводу: {data?.withdrawable ?? 0} ₽</Text>
      <Text style={styles.metric}>Ожидание: {data?.pending ?? 0} ₽</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.white },
  title: { ...typography.title },
  metric: { ...typography.body },
});
