import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../theme/tokens";

type PickupPoint = {
  id: string;
  name: string;
  city: string;
  address: string;
};

function pluralPickupPoints(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} пунктов`;
  if (mod10 === 1) return `${count} пункт`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} пункта`;
  return `${count} пунктов`;
}

export function ProductDeliveryCard({ pickupPoints }: { pickupPoints: PickupPoint[] }) {
  if (pickupPoints.length === 0) return null;

  const cities = [...new Set(pickupPoints.map((p) => p.city).filter(Boolean))];
  const cityLabel = cities.length === 1 ? cities[0] : cities.length > 1 ? "несколько городов" : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Доставка</Text>

      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.black} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Пункты выдачи</Text>
          <Text style={styles.subtitle}>
            {pluralPickupPoints(pickupPoints.length)}
            {cityLabel ? `, ${cityLabel}` : ""}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray500} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  heading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.black,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.black,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#8A8A8A",
  },
});
