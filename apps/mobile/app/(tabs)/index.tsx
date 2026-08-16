import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchBuyerHome } from "../../src/api/endpoints";
import { readSnapshot, saveSnapshot } from "../../src/storage/offline-cache";
import { useAppStore } from "../../src/store/app-store";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function BuyerHomeScreen() {
  const offline = useAppStore((s) => s.offline);
  const [data, setData] = useState(() => readSnapshot<Record<string, unknown>>("buyer-home")?.payload ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetchBuyerHome();
      saveSnapshot("buyer-home", res);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  const favourites = (data as { favourites?: { count: number } })?.favourites?.count ?? 0;
  const orders = (data as { orders?: { active: number } })?.orders?.active ?? 0;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={styles.container}>
      {offline ? <Text style={styles.offline}>Оффлайн — показан сохранённый snapshot</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.title}>Покупатель</Text>
      <View style={styles.card}>
        <Text style={styles.metric}>Избранное: {favourites}</Text>
        <Text style={styles.metric}>Активные заказы: {orders}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  container: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.title, color: colors.black },
  card: { backgroundColor: colors.gray100, borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  metric: { ...typography.body, color: colors.gray900 },
  error: { color: colors.danger },
  offline: { color: colors.gray500 },
});
