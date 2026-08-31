import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";

const VERIFIED_COLOR = "#1D8BF1";

type TrustChip = {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
};

export function ProductSellerCard({
  storeName,
  isVerified,
  trustChips,
  onWriteSeller,
  onViewAllProducts,
  showWriteButton,
  showAllProductsLink,
}: {
  storeName: string;
  isVerified?: boolean;
  trustChips: TrustChip[];
  onWriteSeller: () => void;
  onViewAllProducts?: () => void;
  showWriteButton?: boolean;
  showAllProductsLink?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.sellerBlock}>
          <Text style={styles.label}>Продавец</Text>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{storeName}</Text>
            {isVerified ? <MaterialCommunityIcons name="check-decagram" size={18} color={VERIFIED_COLOR} /> : null}
          </View>
        </View>

        {showWriteButton ? (
          <Pressable style={styles.chatBtn} onPress={onWriteSeller} accessibilityRole="button">
            <MaterialCommunityIcons name="message-text-outline" size={16} color={colors.ctaPrimary} />
            <Text style={styles.chatText}>Написать продавцу</Text>
          </Pressable>
        ) : null}
      </View>

      {trustChips.length > 0 ? (
        <View style={styles.chips}>
          {trustChips.map((chip) => (
            <View key={chip.id} style={styles.chip}>
              <MaterialCommunityIcons name={chip.icon} size={14} color={colors.gray700} />
              <Text style={styles.chipText}>{chip.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {showAllProductsLink && onViewAllProducts ? (
        <Pressable style={styles.allProductsRow} onPress={onViewAllProducts} accessibilityRole="button">
          <Text style={styles.allProducts}>Все товары продавца</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.gray500} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sellerBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  label: {
    ...typography.caption,
    color: "#8A8A8A",
    fontSize: 13,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.black,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.ctaPrimary,
    backgroundColor: colors.white,
    maxWidth: "54%",
  },
  chatText: {
    ...typography.buttonSm,
    color: colors.ctaPrimary,
    fontWeight: "700",
    flexShrink: 1,
    fontSize: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "#F8F8F8",
  },
  chipText: {
    ...typography.caption,
    color: colors.gray700,
    fontSize: 12,
  },
  allProductsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  allProducts: {
    ...typography.body,
    color: colors.black,
    fontSize: 15,
    fontWeight: "500",
  },
});
