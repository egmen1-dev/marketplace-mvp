import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, typography } from "../theme/tokens";
import { HOME_HERO } from "./content";
import { HOME_SCREEN_PADDING } from "./constants";

type HomeHeroBannerProps = {
  imageUrl?: string | null;
};

export function HomeHeroBanner({ imageUrl }: HomeHeroBannerProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.gradientWarm} />

        <View style={styles.copy}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{HOME_HERO.tag}</Text>
          </View>
          <Text style={styles.title}>{HOME_HERO.titleLine1}</Text>
          <Text style={styles.titleAccent}>{HOME_HERO.titleLine2}</Text>
          <Text style={styles.subtitle}>{HOME_HERO.subtitle}</Text>
          <Pressable
            style={styles.cta}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/(tabs)/catalog", params: { deals: "1", sort: "popular" } })}
          >
            <Text style={styles.ctaText}>{HOME_HERO.cta}</Text>
          </Pressable>
        </View>

        <View style={styles.visual}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" transition={200} />
          ) : (
            <View style={styles.imageFallback}>
              <MaterialCommunityIcons name="headphones" size={56} color={colors.ctaPrimary} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: HOME_SCREEN_PADDING,
  },
  card: {
    minHeight: 132,
    borderRadius: 16,
    backgroundColor: "#FFF8F3",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
    position: "relative",
  },
  gradientWarm: {
    position: "absolute",
    right: -20,
    top: -30,
    width: "72%",
    height: "130%",
    borderRadius: 999,
    backgroundColor: "#FFE8D2",
    opacity: 0.55,
  },
  copy: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 2,
    justifyContent: "center",
    zIndex: 1,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FFF0E3",
    marginBottom: 2,
  },
  tagText: {
    fontSize: 11,
    lineHeight: 13,
    color: colors.ctaPrimary,
    fontWeight: "700",
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.black,
  },
  titleAccent: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.ctaPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: "#77777E",
  },
  cta: {
    marginTop: 8,
    alignSelf: "flex-start",
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    ...typography.buttonSm,
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  visual: {
    width: 108,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 4,
    zIndex: 1,
  },
  image: {
    width: 100,
    height: 100,
  },
  imageFallback: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
});
