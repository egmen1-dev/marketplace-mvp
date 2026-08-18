import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { Alert, Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { loadAppConfig } from "../../config/env";
import { usePressScale } from "../../hooks/usePressScale";
import { formatPrice, resolveImageUrl } from "../../utils/format";
import type { MobileProductListItem } from "../../api/endpoints";
import { productStatusLabel, productStatusTone } from "../../theme/status-labels";
import { Badge } from "../primitives/Badge";
import { colors } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export function SellerProductCard({
  product,
  onPress,
  onRefresh,
}: {
  product: MobileProductListItem;
  onPress?: () => void;
  onRefresh?: () => void;
}) {
  const config = loadAppConfig();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  const imageUrl = resolveImageUrl(product.primaryImage?.url ?? null, config.apiBaseUrl);
  const tone = productStatusTone(product.status);

  function openMenu() {
    Alert.alert(product.title, "Действия с товаром", [
      { text: "Открыть карточку", onPress },
      { text: "Обновить список", onPress: onRefresh },
      { text: "Отмена", style: "cancel" },
    ]);
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable style={styles.card} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.thumb}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.thumbImage} contentFit="cover" /> : <Text style={styles.thumbFallback}>📦</Text>}
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <View style={styles.meta}>
            <Badge label={productStatusLabel(product.status)} tone={tone} />
            <Text style={styles.metaText}>Остаток {product.stock ?? 0}</Text>
            <Text style={styles.metaText}>{product.views ?? 0} просм.</Text>
          </View>
        </View>
        <Pressable style={styles.menuBtn} onPress={openMenu} hitSlop={8} accessibilityLabel="Меню товара">
          <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.gray700} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.card,
    minHeight: 96,
  },
  thumb: { width: 88, height: 88, borderRadius: radii.md, overflow: "hidden", backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  thumbImage: { width: "100%", height: "100%" },
  thumbFallback: { fontSize: 28 },
  body: { flex: 1, gap: spacing.xs, paddingRight: spacing.sm },
  title: { ...typography.body, fontWeight: "600", color: colors.black },
  price: { ...typography.h2, color: colors.orange },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  metaText: { ...typography.caption, color: colors.gray500 },
  menuBtn: { minWidth: layout.inputHeight, minHeight: layout.inputHeight, alignItems: "center", justifyContent: "center" },
});
