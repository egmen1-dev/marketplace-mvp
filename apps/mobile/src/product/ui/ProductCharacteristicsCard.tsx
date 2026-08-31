import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";

type Characteristic = {
  name: string;
  displayValue: string;
};

const PREVIEW_COUNT = 4;

export function ProductCharacteristicsCard({ characteristics }: { characteristics: Characteristic[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (characteristics.length === 0) return null;

  const preview = characteristics.slice(0, PREVIEW_COUNT);
  const hasMore = characteristics.length > PREVIEW_COUNT;

  return (
    <>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.heading}>Характеристики</Text>
          {hasMore ? (
            <Pressable style={styles.allBtn} onPress={() => setModalOpen(true)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.allLink}>Все</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.ctaPrimary} />
            </Pressable>
          ) : null}
        </View>

        {preview.map((row) => (
          <View key={row.name} style={styles.row}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.value}>{row.displayValue}</Text>
          </View>
        ))}
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Характеристики</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                <Text style={styles.modalClose}>Закрыть</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {characteristics.map((row) => (
                <View key={row.name} style={styles.row}>
                  <Text style={styles.name}>{row.name}</Text>
                  <Text style={styles.value}>{row.displayValue}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.black,
  },
  allBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  allLink: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.ctaPrimary,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 6,
  },
  name: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8A8A8A",
    flex: 1,
  },
  value: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.black,
    flex: 1,
    textAlign: "right",
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "78%",
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.black,
  },
  modalClose: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.ctaPrimary,
  },
  modalContent: {
    padding: spacing.lg,
    gap: 4,
  },
});
