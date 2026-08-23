import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { PrimaryButton, SecondaryButton, SectionHeader } from "../../src/components/ui";
import { useAppStore } from "../../src/store/app-store";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function SellScreen() {
  const sellerCapable = useAppStore((s) => s.sellerCapable);

  return (
    <View style={styles.container}>
      <SectionHeader title="Продать на ЛОТ" />
      <Text style={styles.lead}>
        Размещайте товары, управляйте остатками и отслеживайте продажи в одном аккаунте.
      </Text>

      {sellerCapable ? (
        <View style={styles.actions}>
          <PrimaryButton label="Мои товары" fullWidth onPress={() => router.push("/(tabs)/seller-products")} />
          <SecondaryButton label="Панель продавца" fullWidth onPress={() => router.push("/(tabs)/seller-home")} />
          <SecondaryButton label="Продажи и заказы" fullWidth onPress={() => router.push("/(tabs)/seller-sales")} />
        </View>
      ) : (
        <View style={styles.card}>
          <MaterialCommunityIcons name="store-plus-outline" size={40} color={colors.orange} />
          <Text style={styles.cardTitle}>Станьте продавцом</Text>
          <Text style={styles.cardText}>
            Подключите продавца в веб-кабинете, чтобы публиковать товары и получать заказы.
          </Text>
          <PrimaryButton
            label="Подключить продавца"
            fullWidth
            onPress={() => router.push("/(tabs)/profile")}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.white },
  lead: { ...typography.body, color: colors.gray700 },
  actions: { gap: spacing.md },
  card: {
    backgroundColor: colors.gray100,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  cardTitle: { ...typography.h2, color: colors.black },
  cardText: { ...typography.body, color: colors.gray700, textAlign: "center" },
});
