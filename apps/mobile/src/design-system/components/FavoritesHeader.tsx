import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { brand, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  itemCount: number;
  fromCache?: boolean;
  onShare?: () => void;
  shareDisabled?: boolean;
};

export const FavoritesHeader = memo(function FavoritesHeader({ itemCount, fromCache, onShare, shareDisabled }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          Избранное
        </Text>
        {itemCount > 0 ? (
          <View style={styles.countBadge} accessibilityLabel={`${itemCount} товаров в коллекции`}>
            <Text style={styles.countText}>{itemCount}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.subtitle}>Ваша персональная коллекция — возвращайтесь, когда будете готовы к покупке.</Text>
      {fromCache ? <Text style={styles.cacheHint}>Показана сохранённая коллекция без сети</Text> : null}
      {onShare ? (
        <Pressable
          style={[styles.shareBtn, shareDisabled && styles.shareBtnDisabled]}
          onPress={onShare}
          disabled={shareDisabled}
          accessibilityRole="button"
          accessibilityLabel="Поделиться списком"
        >
          <MaterialCommunityIcons name="share-variant-outline" size={18} color={shareDisabled ? text.muted : brand.primary} />
          <Text style={[styles.shareText, shareDisabled && styles.shareTextDisabled]}>Поделиться списком</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h1, color: text.primary },
  subtitle: { ...typography.body, color: text.secondary, lineHeight: 22 },
  countBadge: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  countText: { ...typography.caption, color: brand.primary, fontWeight: "700" },
  cacheHint: { ...typography.caption, color: text.muted },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  shareBtnDisabled: { opacity: 0.5 },
  shareText: { ...typography.bodySmall, color: brand.primary, fontWeight: "600" },
  shareTextDisabled: { color: text.muted },
});
