import { Animated, StyleSheet, Text, View } from "react-native";

import { WalletCard } from "../../src/design-system/cards/CommerceCards";
import { PrimaryButton, SecondaryButton } from "../../src/design-system/forms/buttons";
import { PageScroll, SectionHeader } from "../../src/design-system/layout/ScreenLayout";
import { EmptyState, SkeletonGrid } from "../../src/design-system/feedback/States";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useWalletData } from "../../src/features/wallet/useWalletData";
import { formatPrice } from "../../src/utils/format";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

export default function WalletScreen() {
  const fade = useFadeIn();
  const { isSeller, loading, data, recentSales, refreshSales } = useWalletData();

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
          <EmptyState preset="history" actionLabel="Обновить" onAction={() => void refreshSales()} />
        )}

        <SectionHeader title="История операций" />
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Полная история операций кошелька будет доступна в следующем релизе Alpha. Сейчас отображаются баланс и
            последние заказы.
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
