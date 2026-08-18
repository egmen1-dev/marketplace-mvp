import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CheckoutPaymentMethod } from "../../features/cart-checkout/types";
import { brand, border, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { formatPrice } from "../../utils/format";

type Props = {
  method: CheckoutPaymentMethod;
  walletEnabled: boolean;
  walletSpendable: number;
  orderTotal: number;
  error?: string;
  onChange: (method: CheckoutPaymentMethod) => void;
};

export const CheckoutPaymentSection = memo(function CheckoutPaymentSection({
  method,
  walletEnabled,
  walletSpendable,
  orderTotal,
  error,
  onChange,
}: Props) {
  const walletInsufficient = walletEnabled && walletSpendable < orderTotal;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="credit-card-outline" size={22} color={text.primary} />
        <Text style={styles.title}>Способ оплаты</Text>
      </View>

      <Pressable
        style={[styles.option, method === "card" ? styles.optionActive : null]}
        onPress={() => onChange("card")}
        accessibilityRole="button"
        accessibilityState={{ selected: method === "card" }}
      >
        <MaterialCommunityIcons name="credit-card-outline" size={20} color={method === "card" ? brand.primary : text.primary} />
        <View style={styles.optionBody}>
          <Text style={styles.optionTitle}>Банковская карта</Text>
          <Text style={styles.optionHint}>Будет доступно позже в мобильном приложении</Text>
        </View>
      </Pressable>

      {walletEnabled ? (
        <Pressable
          style={[styles.option, method === "wallet" ? styles.optionActive : null, walletInsufficient ? styles.optionDisabled : null]}
          onPress={() => !walletInsufficient && onChange("wallet")}
          disabled={walletInsufficient}
          accessibilityRole="button"
          accessibilityState={{ selected: method === "wallet", disabled: walletInsufficient }}
        >
          <MaterialCommunityIcons name="wallet-outline" size={20} color={method === "wallet" ? brand.primary : text.primary} />
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>Кошелёк LOT</Text>
            <Text style={styles.optionHint}>Доступно {formatPrice(walletSpendable)}</Text>
            {walletInsufficient ? <Text style={styles.warn}>Недостаточно средств для заказа</Text> : null}
          </View>
        </Pressable>
      ) : (
        <View style={styles.alphaNote}>
          <MaterialCommunityIcons name="information-outline" size={18} color={semantic.info} />
          <Text style={styles.alphaText}>Оплата кошельком будет доступна позже для вашего аккаунта.</Text>
        </View>
      )}

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: border.default,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    minHeight: 56,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: surface.backgroundMuted,
  },
  optionActive: { borderColor: brand.primary, backgroundColor: brand.primarySoft },
  optionDisabled: { opacity: 0.55 },
  optionBody: { flex: 1, gap: spacing.xs },
  optionTitle: { ...typography.bodySmall, color: text.primary, fontWeight: "700" },
  optionHint: { ...typography.caption, color: text.muted },
  warn: { ...typography.caption, color: semantic.warning, fontWeight: "600" },
  alphaNote: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: semantic.infoSoft,
  },
  alphaText: { ...typography.caption, color: text.secondary, flex: 1, lineHeight: 18 },
  fieldError: { ...typography.caption, color: semantic.danger, fontWeight: "500" },
});
