import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchSellerHome } from "../../src/api/endpoints";
import { readSnapshot, saveSnapshot } from "../../src/storage/offline-cache";
import { useAppStore } from "../../src/store/app-store";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function SellerHomeScreen() {
  const offline = useAppStore((s) => s.offline);
  const [data, setData] = useState<Record<string, unknown> | null>(
    () => (readSnapshot<Record<string, unknown>>("seller-home")?.payload ?? null),
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchSellerHome();
      saveSnapshot("seller-home", res);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useEffect(() => {
    load();
  }, [load]);

  const money = (data as { money?: { available: number; pending: number } })?.money;
  const orders = (data as { orders?: { needAction: number } })?.orders;
  const products = (data as { products?: { active: number; needAttention: number } })?.products;
  const intelligence = (data as { intelligence?: { topAction: string | null; productId: string | null; confidence?: number; reason?: string } })?.intelligence;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Продавец</Text>
      <View style={styles.card}>
        <Text style={styles.metric}>Доступно: {money?.available ?? 0} ₽</Text>
        <Text style={styles.metric}>В ожидании: {money?.pending ?? 0} ₽</Text>
        <Text style={styles.metric}>Заказы (действие): {orders?.needAction ?? 0}</Text>
        <Text style={styles.metric}>Товары: {products?.active ?? 0} / внимание {products?.needAttention ?? 0}</Text>
      </View>
      {intelligence?.topAction ? (
        <View style={styles.brainCard}>
          <Text style={styles.brainLabel}>Главное действие</Text>
          <Text style={styles.brainAction}>{intelligence.topAction}</Text>
          {intelligence.reason ? <Text style={styles.brainReason}>{intelligence.reason}</Text> : null}
          {typeof intelligence.confidence === "number" ? (
            <Text style={styles.brainReason}>Уверенность: {Math.round(intelligence.confidence * 100)}%</Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.title },
  card: { backgroundColor: colors.gray100, borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  metric: { ...typography.body },
  brainCard: { backgroundColor: colors.orange, borderRadius: 16, padding: spacing.lg, gap: spacing.xs },
  brainLabel: { ...typography.caption, color: colors.white, opacity: 0.9 },
  brainAction: { ...typography.subtitle, color: colors.white },
  brainReason: { ...typography.caption, color: colors.white, opacity: 0.85 },
});
