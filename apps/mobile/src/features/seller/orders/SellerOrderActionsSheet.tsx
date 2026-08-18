import { Pressable, StyleSheet, Text, View } from "react-native";

import type { SellerActionKind } from "../../../domain/contracts/entities/seller";
import { UniversalBottomSheet } from "../../../design-system/components/UniversalBottomSheet";
import { border, text } from "../../../design-system/tokens/colors";
import { layout } from "../../../design-system/tokens/layout";
import { spacing } from "../../../design-system/tokens/spacing";
import { typography } from "../../../design-system/tokens/typography";
import { ORDER_ACTION_LABELS } from "./seller-order-actions";

type Props = {
  visible: boolean;
  title: string;
  actions: SellerActionKind[];
  onClose: () => void;
  onSelect: (action: SellerActionKind) => void;
};

export function SellerOrderActionsSheet({ visible, title, actions, onClose, onSelect }: Props) {
  return (
    <UniversalBottomSheet visible={visible} title="Действия с заказом" subtitle={title} onClose={onClose}>
      <View style={styles.list}>
        {actions.map((action) => (
          <Pressable
            key={action}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={ORDER_ACTION_LABELS[action] ?? action}
            onPress={() => {
              onClose();
              onSelect(action);
            }}
          >
            <Text style={[styles.rowText, action === "cancel_order" ? styles.danger : null]}>
              {ORDER_ACTION_LABELS[action] ?? action}
            </Text>
          </Pressable>
        ))}
      </View>
    </UniversalBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: {
    minHeight: layout.buttonHeight,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: border.default,
    paddingVertical: spacing.sm,
  },
  rowText: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  danger: { color: "#DC2626" },
});
