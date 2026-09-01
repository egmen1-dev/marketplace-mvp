import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HOME_LOCATION_LABEL } from "../../home/content";
import { colors, spacing, typography } from "../../theme/tokens";
import { PRODUCT_SCREEN_PADDING } from "./constants";

function HeaderIconButton({
  icon,
  label,
  onPress,
  active,
  busy,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable style={styles.iconBtn} onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      {busy ? (
        <ActivityIndicator size="small" color={colors.ctaPrimary} />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={active ? colors.danger : colors.black} />
      )}
    </Pressable>
  );
}

export function ProductDetailHeader({
  productId,
  isFavorite,
  isFavoriteBusy,
  onToggleFavorite,
}: {
  productId: string;
  isFavorite: boolean;
  isFavoriteBusy?: boolean;
  onToggleFavorite: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <View style={styles.side}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Назад" hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.black} />
        </Pressable>
        <View style={styles.location} accessibilityRole="text" accessibilityLabel={`Город: ${HOME_LOCATION_LABEL}`}>
          <MaterialCommunityIcons name="map-marker-outline" size={17} color={colors.black} />
          <Text style={styles.locationText}>{HOME_LOCATION_LABEL}</Text>
        </View>
      </View>

      <Pressable
        style={styles.brand}
        onPress={() => router.push("/(tabs)")}
        accessibilityRole="button"
        accessibilityLabel="LOT — на главную"
      >
        <Text style={styles.brandText}>LOT</Text>
      </Pressable>

      <View style={[styles.side, styles.sideRight]}>
        <HeaderIconButton
          icon="share-variant-outline"
          label="Поделиться"
          onPress={() => Share.share({ message: `lot://product/${productId}`, url: `lot://product/${productId}` })}
        />
        <HeaderIconButton
          icon={isFavorite ? "heart" : "heart-outline"}
          label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
          onPress={onToggleFavorite}
          active={isFavorite}
          busy={isFavoriteBusy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PRODUCT_SCREEN_PADDING,
    paddingBottom: 10,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 2,
  },
  sideRight: {
    justifyContent: "flex-end",
    gap: 2,
  },
  backBtn: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 0,
    flexShrink: 1,
  },
  locationText: {
    ...typography.caption,
    color: colors.black,
    fontWeight: "600",
    fontSize: 13,
    maxWidth: 88,
  },
  brand: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
  },
  brandText: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.ctaPrimary,
    letterSpacing: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
