import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TextField } from "./TextField";
import type { CheckoutContactFields } from "../../features/cart-checkout/types";
import { border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  value: CheckoutContactFields;
  errors: { phone?: string; email?: string };
  onChange: (patch: Partial<CheckoutContactFields>) => void;
};

export const CheckoutContactSection = memo(function CheckoutContactSection({ value, errors, onChange }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="phone-outline" size={22} color={text.primary} />
        <Text style={styles.title}>Контакты</Text>
      </View>
      <TextField
        label="Телефон"
        value={value.phone}
        onChangeText={(phone) => onChange({ phone })}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="+7 (___) ___-__-__"
        error={errors.phone}
      />
      <TextField
        label="Email (необязательно)"
        value={value.email}
        onChangeText={(email) => onChange({ email })}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="email@example.com"
        error={errors.email}
      />
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
});
