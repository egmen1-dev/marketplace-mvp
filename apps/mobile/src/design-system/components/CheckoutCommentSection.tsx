import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TextField } from "./TextField";
import { border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export const CheckoutCommentSection = memo(function CheckoutCommentSection({ value, onChange }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="message-text-outline" size={22} color={text.primary} />
        <Text style={styles.title}>Комментарий</Text>
      </View>
      <TextField
        label="Комментарий к заказу"
        value={value}
        onChangeText={onChange}
        placeholder="Пожелания по доставке или сборке"
        multiline
        numberOfLines={3}
        style={styles.input}
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
  input: { minHeight: 88, textAlignVertical: "top" },
});
