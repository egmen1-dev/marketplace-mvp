import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SectionErrorCard } from "./SectionErrorCard";
import { TextField } from "./TextField";
import type { CheckoutDeliveryFields, DeliveryQuoteView, PickupPointView } from "../../features/cart-checkout/types";
import { brand, border, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  value: CheckoutDeliveryFields;
  errors: { city?: string; pickupPointCode?: string };
  quote: DeliveryQuoteView | null;
  quoteLoading: boolean;
  quoteError: string | null;
  points: PickupPointView[];
  pointsLoading: boolean;
  pointsError: string | null;
  onChange: (patch: Partial<CheckoutDeliveryFields>) => void;
  onRetryQuote: () => void;
  onRetryPoints: () => void;
};

export const CheckoutDeliverySection = memo(function CheckoutDeliverySection({
  value,
  errors,
  quote,
  quoteLoading,
  quoteError,
  points,
  pointsLoading,
  pointsError,
  onChange,
  onRetryQuote,
  onRetryPoints,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="truck-delivery-outline" size={22} color={text.primary} />
        <Text style={styles.title}>Доставка</Text>
      </View>

      <TextField
        label="Город"
        value={value.city}
        onChangeText={(city) => onChange({ city })}
        placeholder="Москва"
        error={errors.city}
      />

      <View style={styles.methodRow}>
        {(["PICKUP", "COURIER"] as const).map((method) => {
          const active = value.method === method;
          return (
            <Pressable
              key={method}
              style={[styles.methodChip, active ? styles.methodChipActive : null]}
              onPress={() => onChange({ method })}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.methodText, active ? styles.methodTextActive : null]}>
                {method === "PICKUP" ? "Пункт выдачи" : "Курьер"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value.method === "PICKUP" ? (
        <>
          {pointsLoading ? <Text style={styles.hint}>Загружаем пункты выдачи…</Text> : null}
          {pointsError ? <SectionErrorCard message={pointsError} onRetry={onRetryPoints} /> : null}
          {!pointsLoading && !pointsError && points.length === 0 ? (
            <Text style={styles.hint}>Пункты выдачи для города не найдены</Text>
          ) : null}
          {!pointsLoading && points.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pointsRail}>
              {points.map((point) => {
                const selected = value.pickupPointCode === point.code;
                return (
                  <Pressable
                    key={point.code}
                    style={[styles.pointCard, selected ? styles.pointCardActive : null]}
                    onPress={() => onChange({ pickupPointCode: point.code })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={styles.pointName} numberOfLines={2}>
                      {point.name}
                    </Text>
                    <Text style={styles.pointAddress} numberOfLines={2}>
                      {point.address}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          {errors.pickupPointCode ? <Text style={styles.fieldError}>{errors.pickupPointCode}</Text> : null}
        </>
      ) : (
        <View style={styles.alphaNote}>
          <MaterialCommunityIcons name="information-outline" size={18} color={semantic.info} />
          <Text style={styles.alphaText}>Курьерская доставка в мобильном приложении — Alpha. Расчёт доступен, оформление будет позже.</Text>
        </View>
      )}

      {quoteLoading ? <Text style={styles.hint}>Рассчитываем стоимость доставки…</Text> : null}
      {quoteError ? <SectionErrorCard message={quoteError} onRetry={onRetryQuote} /> : null}
      {quote ? (
        <View style={styles.quoteCard}>
          <Text style={styles.quoteLabel}>Доставка</Text>
          <Text style={styles.quoteValue}>
            {quote.cost.toLocaleString("ru-RU")} {quote.currency === "RUB" ? "₽" : quote.currency}
          </Text>
          <Text style={styles.quoteEta}>{quote.etaLabel}</Text>
        </View>
      ) : null}
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
  methodRow: { flexDirection: "row", gap: spacing.sm },
  methodChip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: border.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: surface.backgroundMuted,
  },
  methodChipActive: { borderColor: brand.primary, backgroundColor: brand.primarySoft },
  methodText: { ...typography.bodySmall, color: text.secondary, fontWeight: "600" },
  methodTextActive: { color: brand.primary },
  hint: { ...typography.caption, color: text.muted },
  pointsRail: { gap: spacing.sm },
  pointCard: {
    width: 220,
    minHeight: 88,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: surface.backgroundMuted,
    gap: spacing.xs,
  },
  pointCardActive: { borderColor: brand.primary, backgroundColor: brand.primarySoft },
  pointName: { ...typography.bodySmall, color: text.primary, fontWeight: "700" },
  pointAddress: { ...typography.caption, color: text.muted },
  fieldError: { ...typography.caption, color: semantic.danger, fontWeight: "500" },
  alphaNote: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: semantic.infoSoft,
  },
  alphaText: { ...typography.caption, color: text.secondary, flex: 1, lineHeight: 18 },
  quoteCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: surface.backgroundMuted,
    gap: spacing.xs,
  },
  quoteLabel: { ...typography.caption, color: text.muted },
  quoteValue: { ...typography.subtitle, color: text.primary, fontWeight: "800" },
  quoteEta: { ...typography.caption, color: text.secondary },
});
