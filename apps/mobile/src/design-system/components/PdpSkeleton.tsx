import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { ShimmerBlock } from "../../components/ui/Shimmer";
import { surface } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { PdpGallerySkeleton } from "./PdpGallery";

export const PdpSkeleton = memo(function PdpSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Загрузка карточки товара">
      <PdpGallerySkeleton />
      <View style={styles.content}>
        <ShimmerBlock height={36} width="45%" />
        <ShimmerBlock height={24} width="90%" />
        <ShimmerBlock height={24} width="70%" />
        <ShimmerBlock height={72} width="100%" style={styles.block} />
        <ShimmerBlock height={120} width="100%" style={styles.block} />
        <ShimmerBlock height={160} width="100%" style={styles.block} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: surface.background },
  content: { padding: spacing.lg, gap: spacing.md },
  block: { borderRadius: radii.md },
});
