import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { PrimaryButton, SecondaryButton, SectionHeader } from "../../src/components/ui";
import { openWebHandoff } from "../../src/navigation/web-handoff";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

export default function SellScreen() {
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const setPendingWebHandoff = useAppStore((s) => s.setPendingWebHandoff);
  const [opening, setOpening] = useState(false);

  async function onCreateStore() {
    setOpening(true);
    try {
      setPendingWebHandoff("seller");
      await openWebHandoff("/account/seller-start");
    } finally {
      setOpening(false);
    }
  }

  if (sellerCapable) {
    return (
      <View style={styles.container}>
        <SectionHeader title="Продать" />
        <View style={styles.sellerHub}>
          <Text style={styles.hubTitle}>Выложите ЛОТ</Text>
          <Text style={styles.hubBody}>Создайте ЛОТ и опубликуйте его для покупателей</Text>
          <View style={styles.actions}>
            <PrimaryButton label="Создать ЛОТ" fullWidth onPress={() => router.push("/sell/create")} />
            <SecondaryButton label="Мои ЛОТы" fullWidth onPress={() => router.push("/(tabs)/seller-products")} />
            <SecondaryButton label="Заказы" fullWidth onPress={() => router.push("/(tabs)/seller-sales")} />
            <SecondaryButton label="Сообщения" fullWidth onPress={() => router.push("/messages")} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionHeader title="Продать" />
      <View style={styles.card}>
        <MaterialCommunityIcons name="store-plus-outline" size={40} color={colors.orange} />
        <Text style={styles.cardTitle}>Начните продавать на LOT</Text>
        <Text style={styles.cardText}>Создайте свой первый ЛОТ</Text>
        <PrimaryButton
          label="Создать магазин"
          fullWidth
          loading={opening}
          onPress={() => void onCreateStore()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.white },
  sellerHub: { gap: spacing.lg },
  hubTitle: { ...typography.h2, color: colors.black },
  hubBody: { ...typography.body, color: colors.gray700 },
  actions: { gap: spacing.md },
  card: {
    backgroundColor: colors.gray100,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  cardTitle: { ...typography.h2, color: colors.black, textAlign: "center" },
  cardText: { ...typography.body, color: colors.gray700, textAlign: "center" },
});
