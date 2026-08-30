import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, typography } from "../theme/tokens";
import { HOME_HERO } from "./content";
import { HOME_SCREEN_PADDING } from "./constants";

type HomeHeroBannerProps = {
  imageUrl?: string | null;
};

export function HomeHeroBanner({ imageUrl }: HomeHeroBannerProps) {
  const [activeDot, setActiveDot] = useState(0);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.gradientWarm} />
        <View style={styles.gradientFade} />

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
              <MaterialCommunityIcons name="headphones" size={76} color={colors.ctaPrimary} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.dots}>
        {[0, 1, 2].map((index) => (
          <Pressable key={index} onPress={() => setActiveDot(index)} accessibilityRole="button">
            <View style={[styles.dot, activeDot === index ? styles.dotActive : styles.dotInactive]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: HOME_SCREEN_PADDING,
    gap: 10,
  },
  card: {
    minHeight: 176,
    borderRadius: 20,
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
  gradientFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
    backgroundColor: colors.white,
    opacity: 0.12,
  },
  copy: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 4,
    justifyContent: "center",
    zIndex: 1,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FFF0E3",
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    lineHeight: 14,
    color: colors.ctaPrimary,
    fontWeight: "700",
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.black,
  },
  titleAccent: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.ctaPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 17,
    color: "#777777",
  },
  cta: {
    marginTop: 12,
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    ...typography.buttonSm,
    color: colors.white,
    fontWeight: "700",
  },
  visual: {
    width: 138,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 4,
    paddingBottom: 0,
    zIndex: 1,
  },
  image: {
    width: 132,
    height: 132,
  },
  imageFallback: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.ctaPrimary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#D9D9D9",
  },
});
