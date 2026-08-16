import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TextField } from "./TextField";
import type { CheckoutRecipientFields } from "../../features/cart-checkout/types";
import { border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  value: CheckoutRecipientFields;
  errors: { fullName?: string };
  onChange: (patch: Partial<CheckoutRecipientFields>) => void;
};

export const CheckoutRecipientSection = memo(function CheckoutRecipientSection({ value, errors, onChange }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="account-outline" size={22} color={text.primary} />
        <Text style={styles.title}>Получатель</Text>
      </View>
      <TextField
        label="ФИО получателя"
        value={value.fullName}
        onChangeText={(fullName) => onChange({ fullName })}
        autoComplete="name"
        placeholder="Иванов Иван"
        error={errors.fullName}
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
