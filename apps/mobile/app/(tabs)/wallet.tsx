import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { fetchSellerOrders, fetchWallet } from "../../src/api/endpoints";
import {
  EmptyState,
  PageScroll,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SkeletonGrid,
  WalletCard,
} from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useAppStore } from "../../src/store/app-store";
import { formatPrice } from "../../src/utils/format";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

export default function WalletScreen() {
  const fade = useFadeIn();
  const mode = useAppStore((s) => s.mode);
  const isSeller = mode === "seller";
  const [data, setData] = useState<{ spendable: number; withdrawable: number; pending: number; enabled: boolean } | null>(null);
  const [recentSales, setRecentSales] = useState<Array<{ id: string; orderNumber: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const salesPromise = isSeller
      ? fetchSellerOrders().catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] });

    Promise.all([fetchWallet(), salesPromise])
      .then(([wallet, sales]) => {
        setData(wallet);
        setRecentSales(
          sales.items.slice(0, 3).map((item) => ({
            id: item.id,
            orderNumber: item.orderNumber,
            status: item.status,
          })),
        );
      })
      .finally(() => setLoading(false));
  }, [isSeller]);

  if (loading) {
    return (
      <PageScroll>
        <SkeletonGrid count={1} />
      </PageScroll>
    );
  }

  if (!data?.enabled) {
    return <EmptyState preset="wallet" description="Кошелёк временно недоступен на этой среде." />;
  }

  return (
    <PageScroll>
      <Animated.View style={{ opacity: fade, gap: spacing.lg }}>
        <WalletCard balance={data.spendable} withdrawable={data.withdrawable} pending={data.pending} />

        <View style={styles.actions}>
          <PrimaryButton label="Пополнение" fullWidth disabled onPress={() => {}} />
          <SecondaryButton label="Вывод" fullWidth disabled onPress={() => {}} />
        </View>

        <SectionHeader title="Ожидающие выплаты" />
        {(data.pending ?? 0) > 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>В обработке</Text>
            <Text style={styles.infoValue}>{formatPrice(data.pending)}</Text>
            <Text style={styles.infoHint}>Средства появятся на балансе после завершения заказов.</Text>
          </View>
        ) : (
          <EmptyState preset="history" title="Нет ожидающих выплат" description="Все начисления уже доступны." />
        )}

        <SectionHeader title={isSeller ? "Последние продажи" : "Последние переводы"} />
        {recentSales.length > 0 ? (
          recentSales.map((sale) => (
            <View key={sale.id} style={styles.transferRow}>
              <Text style={styles.transferTitle}>Заказ № {sale.orderNumber}</Text>
              <Text style={styles.transferMeta}>{sale.status}</Text>
            </View>
          ))
        ) : (
          <EmptyState
            preset="history"
            actionLabel="Обновить"
            onAction={() =>
              fetchSellerOrders()
                .then((r) =>
                  setRecentSales(
                    r.items.slice(0, 3).map((item) => ({
                      id: item.id,
                      orderNumber: item.orderNumber,
                      status: item.status,
                    })),
                  ),
                )
                .catch(() => setRecentSales([]))
            }
          />
        )}

        <SectionHeader title="История операций" />
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Полная история операций кошелька будет доступна в следующем релизе Alpha. Сейчас отображаются баланс и последние заказы.
          </Text>
        </View>
      </Animated.View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  infoCard: { backgroundColor: colors.orangeSoft, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  infoTitle: { ...typography.caption, color: colors.gray700 },
  infoValue: { ...typography.h1, color: colors.black },
  infoHint: { ...typography.caption, color: colors.gray500 },
  transferRow: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  transferTitle: { ...typography.body, fontWeight: "600", color: colors.black },
  transferMeta: { ...typography.caption, color: colors.gray500 },
  placeholder: { backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg },
  placeholderText: { ...typography.body, color: colors.gray700 },
});
