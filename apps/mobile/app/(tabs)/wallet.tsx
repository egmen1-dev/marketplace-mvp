import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fetchWallet } from "../../src/api/endpoints";
import { EmptyState, LoadingState, PageScroll, SecondaryButton, SectionHeader, WalletCard } from "../../src/components/ui";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function WalletScreen() {
  const [data, setData] = useState<{ spendable: number; withdrawable: number; pending: number; enabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Загружаем кошелёк…" />;

  if (!data?.enabled) {
    return <EmptyState title="Кошелёк недоступен" description="Функция временно отключена на staging." />;
  }

  return (
    <PageScroll>
      <WalletCard balance={data.spendable} withdrawable={data.withdrawable} pending={data.pending} />

      <View style={styles.actions}>
        <SecondaryButton label="Пополнение" fullWidth onPress={() => {}} disabled />
        <SecondaryButton label="Вывод" fullWidth onPress={() => {}} disabled />
      </View>

      <SectionHeader title="Последние операции" />
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>История операций появится в следующем обновлении Alpha.</Text>
      </View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  placeholder: { backgroundColor: colors.gray100, borderRadius: 16, padding: spacing.lg },
  placeholderText: { ...typography.body, color: colors.gray700 },
});
