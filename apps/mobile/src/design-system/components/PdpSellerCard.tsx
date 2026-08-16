import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CommerceSectionHeader } from "./CommerceSectionHeader";
import { border, semantic, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { ProductSeller } from "../../features/product-detail/types";

type Props = {
  seller: ProductSeller;
  onPress?: () => void;
};

export const PdpSellerCard = memo(function PdpSellerCard({ seller, onPress }: Props) {
  const countLabel =
    seller.productCount != null && seller.productCount > 0
      ? seller.productCount > 8
        ? "8+ товаров"
        : `${seller.productCount} ${seller.productCount === 1 ? "товар" : seller.productCount < 5 ? "товара" : "товаров"}`
      : null;

  const content = (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="storefront-outline" size={22} color={text.primary} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {seller.storeName}
        </Text>
        <View style={styles.subRow}>
          {countLabel ? <Text style={styles.subtitle}>{countLabel}</Text> : null}
          {seller.isVerified ? (
            <View style={styles.verified}>
              <MaterialCommunityIcons name="shield-check" size={14} color={semantic.success} />
              <Text style={styles.verifiedText}>Проверен</Text>
            </View>
          ) : null}
        </View>
      </View>
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={22} color={text.muted} /> : null}
    </View>
  );

  return (
    <View style={styles.wrap}>
      <CommerceSectionHeader title="Продавец" />
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Продавец ${seller.storeName}`} onPress={onPress}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: border.default,
    minHeight: 72,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { flex: 1, gap: spacing.xs },
  name: { ...typography.body, color: text.primary, fontWeight: "700" },
  subRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  subtitle: { ...typography.caption, color: text.muted },
  verified: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifiedText: { ...typography.caption, color: semantic.success, fontWeight: "600" },
});
