import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryCTA } from "./PrimaryCTA";
import { brand, surface, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  onBrowseCatalog: () => void;
};

export const FavoritesEmptyState = memo(function FavoritesEmptyState({ onBrowseCatalog }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.illustration}>
        <MaterialCommunityIcons name="heart-multiple-outline" size={72} color={brand.primaryMuted} />
      </View>
      <Text style={styles.title}>Соберите свою коллекцию</Text>
      <Text style={styles.body}>
        Сохраняйте понравившиеся товары — они будут ждать вас здесь, когда решите вернуться к покупкам.
      </Text>
      <PrimaryCTA label="Перейти в каталог" fullWidth onPress={onBrowseCatalog} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["3xl"],
    gap: spacing.lg,
    backgroundColor: surface.background,
  },
  illustration: {
    width: layout.emptyIllustrationSize,
    height: layout.emptyIllustrationSize,
    borderRadius: layout.emptyIllustrationSize / 2,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.h1, color: text.primary, textAlign: "center" },
  body: { ...typography.body, color: text.secondary, textAlign: "center", lineHeight: 22 },
});
