import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CommerceSectionHeader } from "./CommerceSectionHeader";
import { text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { ProductPickupPoint } from "../../features/product-detail/types";

type Props = {
  pickupPoints: ProductPickupPoint[];
};

export const PdpDeliveryBlock = memo(function PdpDeliveryBlock({ pickupPoints }: Props) {
  const activePoints = pickupPoints.filter((p) => p.isActive !== false);
  if (activePoints.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <CommerceSectionHeader title="Доставка и самовывоз" />
      {activePoints.length > 0 ? (
        activePoints.slice(0, 3).map((point) => (
          <View key={point.id} style={styles.point}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={text.secondary} />
            <View style={styles.pointText}>
              <Text style={styles.pointTitle}>{point.name}</Text>
              <Text style={styles.pointMeta}>
                {point.city}, {point.address}
              </Text>
              {point.workingHours ? <Text style={styles.pointMeta}>{point.workingHours}</Text> : null}
            </View>
          </View>
        ))
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  point: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", minHeight: 44 },
  pointText: { flex: 1, gap: spacing.xs },
  pointTitle: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  pointMeta: { ...typography.caption, color: text.muted },
  body: { ...typography.body, color: text.secondary },
});
