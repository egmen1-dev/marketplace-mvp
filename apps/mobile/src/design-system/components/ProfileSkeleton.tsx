import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { ShimmerBlock } from "../../components/ui/Shimmer";
import { surface } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";

export const ProfileSkeleton = memo(function ProfileSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Загрузка профиля">
      <View style={styles.header}>
        <ShimmerBlock height={64} width={64} style={styles.avatar} />
        <View style={styles.headerBody}>
          <ShimmerBlock height={24} width="60%" />
          <ShimmerBlock height={16} width="80%" />
          <ShimmerBlock height={28} width="50%" />
        </View>
      </View>
      <ShimmerBlock height={140} style={styles.card} />
      <ShimmerBlock height={120} style={styles.card} />
      <ShimmerBlock height={88} style={styles.card} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.lg, backgroundColor: surface.background },
  header: { flexDirection: "row", gap: spacing.md },
  avatar: { borderRadius: 32 },
  headerBody: { flex: 1, gap: spacing.sm },
  card: { borderRadius: radii.xl },
});
